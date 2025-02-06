# Franchise Table Structure Analysis

## Current Two-Table Structure

### Benefits
1. **Separation of Concerns**
   - `franchises`: Core identity and contact information
   - `franchise_settings`: Operational configurations
   - Allows independent updates of settings without affecting core data

2. **Default Values Management**
   - Settings table has predefined defaults
   - Automatic creation of settings via trigger on franchise creation
   - Easy to reset settings without touching franchise data

3. **Data Integrity**
   - One-to-one relationship enforced by unique constraint
   - Prevents orphaned settings
   - Follows database normalization principles

4. **Performance**
   - Smaller main franchise table for frequent lookups
   - Settings changes don't fragment the main franchise data

### Drawbacks
1. **Additional Join**
   - Need to join tables to get complete franchise info
   - Slightly more complex queries

## Potential Single Table Structure

### Benefits
1. **Simpler Queries**
   - No joins needed for complete franchise data
   - Slightly simpler code

2. **Atomic Updates**
   - All franchise data updated in one transaction
   - No need for additional triggers

### Drawbacks
1. **Mixed Concerns**
   - Core identity mixed with changeable settings
   - More complex updates when only changing settings

2. **Default Management**
   - More complex default value handling
   - No clean way to reset only settings

3. **Data Bloat**
   - Larger table size
   - More frequent updates to the whole record

## Recommendation

**Keep the current two-table structure** because:

1. It follows database best practices for separation of concerns
2. Provides cleaner management of settings and defaults
3. Better supports potential future extensions of settings
4. More maintainable in the long term
5. Franchise settings changes don't affect core franchise data
6. The join overhead is minimal with proper indexing

The current structure is well-designed and the minor complexity of having two tables is outweighed by the benefits in maintainability and data management.