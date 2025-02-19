import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { toast } from 'react-hot-toast';

interface StaffPinProps {
  onVerify: (pin: string) => Promise<boolean>;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const StaffPin: React.FC<StaffPinProps> = ({
  onVerify,
  onSuccess,
  onCancel,
  title = 'Enter PIN',
  message = 'Please enter your 4-digit PIN to continue'
}) => {
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);

    // Auto-submit when 4 digits are entered
    if (value.length === 4) {
      submitPin().catch(console.error);
    }
  };

  const submitPin = async () => {
    if (isLoading || pin.length !== 4) return false;

    setIsLoading(true);
    try {
      const isValid = await onVerify(pin);
      if (isValid) {
        onSuccess();
        return true;
      } else {
        setAttempt(prev => prev + 1);
        setPin('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
        toast.error('Invalid PIN');
        return false;
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      toast.error('Error verifying PIN');
      setPin('');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPin();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && pin.length === 4) {
      e.preventDefault();
      void submitPin();
    }
  };

  return (
    <Modal isOpen onClose={onCancel} title={title}>
      <div className="w-full max-w-sm p-6">
        <p className="text-gray-600 mb-4 text-center">{message}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="flex justify-center space-x-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-12 h-14 border-2 rounded-md flex items-center justify-center text-xl font-bold ${
                    pin[index] ? 'border-orange-500' : 'border-gray-300'
                  }`}
                >
                  {pin[index] ? '•' : '_'}
                </div>
              ))}
            </div>

            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={pin}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="absolute opacity-0 w-full h-full cursor-pointer top-0 left-0"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {attempt > 0 && (
            <div className="text-center text-red-500 text-sm">
              Invalid PIN. Please try again.
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (pin.length > 0 && pin.length < 4)}
              className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default StaffPin;