import { supabase } from '../lib/supabase';

interface MenuItem {
  name: string;
  price?: number;
  base_price?: number;
  variants?: [string, number][];
}

interface Category {
  items: MenuItem[];
}

interface MenuData {
  categories: {
    [key: string]: Category;
  };
}

async function createSchema() {
  try {
    // Create categories table
    const { error: categoriesError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'categories',
      definition: `
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      `
    });

    if (categoriesError) {
      console.error('Error creating categories table:', categoriesError);
      return false;
    }

    // Create menu_items table
    const { error: menuItemsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'menu_items',
      definition: `
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_id uuid REFERENCES categories(id),
        name TEXT NOT NULL,
        base_price INTEGER NOT NULL,
        has_variants BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(category_id, name)
      `
    });

    if (menuItemsError) {
      console.error('Error creating menu_items table:', menuItemsError);
      return false;
    }

    // Create item_variants table
    const { error: variantsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'item_variants',
      definition: `
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        menu_item_id uuid REFERENCES menu_items(id),
        variant_name TEXT NOT NULL,
        price INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(menu_item_id, variant_name)
      `
    });

    if (variantsError) {
      console.error('Error creating item_variants table:', variantsError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating schema:', error);
    return false;
  }
}

async function insertMenuData(menuData: MenuData) {
  try {
    // First ensure schema exists
    const schemaCreated = await createSchema();
    if (!schemaCreated) {
      throw new Error('Failed to create database schema');
    }

    // Clear existing data using soft delete
    const { error: deleteError } = await supabase
      .from('item_variants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error deleting variants:', deleteError);
      return false;
    }

    const { error: deleteItemsError } = await supabase
      .from('menu_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteItemsError) {
      console.error('Error deleting items:', deleteItemsError);
      return false;
    }

    const { error: deleteCategoriesError } = await supabase
      .from('categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteCategoriesError) {
      console.error('Error deleting categories:', deleteCategoriesError);
      return false;
    }

    // Insert categories and get their IDs
    const categoryEntries = Object.entries(menuData.categories);
    for (const [categoryName, categoryData] of categoryEntries) {
      const { data: categoryResult, error: categoryError } = await supabase
        .from('categories')
        .insert({ name: categoryName })
        .select('id')
        .single();

      if (categoryError) {
        console.error(`Error inserting category ${categoryName}:`, categoryError);
        continue;
      }

      const categoryId = categoryResult.id;

      // Insert menu items for this category
      for (const item of categoryData.items) {
        const hasVariants = Boolean(item.variants && item.variants.length > 0);
        const basePrice = hasVariants ? item.base_price! : item.price!;

        const { data: menuItemResult, error: menuItemError } = await supabase
          .from('menu_items')
          .insert({
            category_id: categoryId,
            name: item.name,
            base_price: basePrice,
            has_variants: hasVariants
          })
          .select('id')
          .single();

        if (menuItemError) {
          console.error(`Error inserting menu item ${item.name}:`, menuItemError);
          continue;
        }

        // Insert variants if any
        if (hasVariants && item.variants) {
          const variantData = item.variants.map(([variantName, price]) => ({
            menu_item_id: menuItemResult.id,
            variant_name: variantName,
            price: price
          }));

          const { error: variantError } = await supabase
            .from('item_variants')
            .insert(variantData);

          if (variantError) {
            console.error(`Error inserting variants for ${item.name}:`, variantError);
          }
        }
      }
    }

    console.log('Menu data inserted successfully!');
    return true;
  } catch (error) {
    console.error('Error inserting menu data:', error);
    return false;
  }
}

export const menuData: MenuData = {
  categories: {
    "Soups": {
      items: [
        { name: "Sweet Corn Chicken Soup", price: 113 },
        { name: "Hot & Sour Veg Soup", price: 104 },
        { name: "Hot & Sour Chicken Soup", price: 123 },
        { name: "Manchow Veg Soup", price: 132 },
        { name: "Manchow Chicken Soup", price: 151 }
      ]
    },
    "Premium Starters": {
      items: [
        {
          name: "Salt & Pepper",
          base_price: 161,
          variants: [
            ["Chicken", 161],
            ["Prawn", 208],
            ["Veg", 142]
          ]
        },
        {
          name: "Singapore Style",
          base_price: 199,
          variants: [
            ["Chicken", 199],
            ["Prawn", 246],
            ["Veg", 161]
          ]
        },
        {
          name: "Hong Kong Style",
          base_price: 180,
          variants: [
            ["Chicken", 180],
            ["Prawn", 227],
            ["Veg", 151]
          ]
        },
        {
          name: "Dragon Special",
          base_price: 151,
          variants: [
            ["Chicken", 151],
            ["Prawn", 199],
            ["Veg", 132]
          ]
        },
        {
          name: "Chilly Style",
          base_price: 142,
          variants: [
            ["Chicken", 142],
            ["Prawn", 189],
            ["Veg", 123]
          ]
        },
        {
          name: "Manchurian",
          base_price: 142,
          variants: [
            ["Chicken", 142],
            ["Prawn", 189],
            ["Veg", 123]
          ]
        },
        {
          name: "Garlic Style",
          base_price: 170,
          variants: [
            ["Chicken", 170],
            ["Prawn", 218],
            ["Veg", 142]
          ]
        },
        {
          name: "65",
          base_price: 142,
          variants: [
            ["Bone", 142],
            ["Boneless", 180]
          ]
        }
      ]
    },
    "Chef's Special": {
      items: [
        {
          name: "Dynamite",
          base_price: 189,
          variants: [
            ["Chicken", 189],
            ["Prawn", 237]
          ]
        },
        {
          name: "Moru Moru",
          base_price: 151,
          variants: [
            ["Chicken", 151],
            ["Prawn", 208]
          ]
        },
        { name: "Honey Glazed Chicken Wings", price: 142 },
        {
          name: "Lolipop",
          base_price: 151,
          variants: [
            ["Dry", 151],
            ["Saucy", 170]
          ]
        },
        { name: "Dragon Paneer", price: 132 }
      ]
    },
    "Arabian Corner": {
      items: [
        { name: "Mixed Grill Platter", price: 569 },
        {
          name: "Tandoori Chicken",
          base_price: 379,
          variants: [
            ["Full", 379],
            ["Half", 218]
          ]
        },
        { name: "Chicken Tikka", price: 208 },
        { name: "Malai Tikka", price: 227 },
        { name: "Chicken Seekh Kebab", price: 208 }
      ]
    },
    "Breads": {
      items: [
        {
          name: "Naan",
          base_price: 28,
          variants: [
            ["Plain", 28],
            ["Butter", 48],
            ["Garlic", 66],
            ["Cheese", 86]
          ]
        },
        {
          name: "Roti",
          base_price: 38,
          variants: [
            ["Tandoori", 38],
            ["Butter", 57]
          ]
        }
      ]
    },
    "Signature Biriyani": {
      items: [
        { name: "Normal Biriyani", price: 143 },
        { name: "Thokku Special Biriyani", price: 180 },
        { name: "Double Masala Biriyani", price: 208 },
        { name: "Chicken 65 Biriyani", price: 170 },
        { name: "Prawn Biriyani", price: 237 },
        { name: "Plain Biriyani", price: 85 },
        { name: "Offer Biriyani", price: 219 }
      ]
    },
    "Gravy Specials": {
      items: [
        { name: "Chicken Tikka Masala", price: 170 },
        { name: "Butter Chicken", price: 180 },
        { name: "Egg Masala", price: 104 },
        { name: "Kara Punjabi Chicken", price: 208 },
        { name: "Prawn Masala", price: 237 },
        {
          name: "Kadai",
          base_price: 151,
          variants: [
            ["Gobi", 151],
            ["Paneer", 151],
            ["Mushroom", 151]
          ]
        },
        { name: "Pepper Chicken", price: 151 },
        { name: "Mixed Veg Kadai", price: 176 },
        { name: "Paneer Butter Masala", price: 151 }
      ]
    },
    "Rice & Noodles": {
      items: [
        {
          name: "Veg",
          base_price: 132,
          variants: [
            ["Rice", 132],
            ["Noodles", 132]
          ]
        },
        {
          name: "Chicken",
          base_price: 151,
          variants: [
            ["Rice", 151],
            ["Noodles", 151]
          ]
        },
        {
          name: "Prawn",
          base_price: 199,
          variants: [
            ["Rice", 199],
            ["Noodles", 199]
          ]
        },
        {
          name: "Mixed Non-Veg Special",
          base_price: 237,
          variants: [
            ["Rice", 237],
            ["Noodles", 237]
          ]
        },
        {
          name: "Chilli-Garlic Rice",
          base_price: 199,
          variants: [
            ["Chicken", 199],
            ["Prawn", 237]
          ]
        },
        { name: "Triple Schezwan Rice", price: 256 },
        {
          name: "Veg Options",
          base_price: 132,
          variants: [
            ["Gobi Rice", 132],
            ["Mushroom Rice", 132],
            ["Paneer Rice", 151],
            ["Mixed Veg Rice", 161]
          ]
        }
      ]
    },
    "Refreshing Mojitos": {
      items: [
        {
          name: "Blue Ocean",
          base_price: 85,
          variants: [
            ["Single", 85],
            ["Double", 161]
          ]
        },
        {
          name: "Virgin Mojito",
          base_price: 66,
          variants: [
            ["Single", 66],
            ["Double", 123]
          ]
        },
        {
          name: "Strawberry Blast",
          base_price: 66,
          variants: [
            ["Single", 66],
            ["Double", 123]
          ]
        },
        {
          name: "Pomegranate Fresh",
          base_price: 75,
          variants: [
            ["Single", 75],
            ["Double", 142]
          ]
        }
      ]
    }
  }
};

export { insertMenuData };
