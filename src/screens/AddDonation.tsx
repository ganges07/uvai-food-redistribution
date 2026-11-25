import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Input, Select, Button, Toast } from '@/components/ui';
import { CATEGORY_LABELS, type FoodCategory } from '@/types';
import { fromDatetimeLocal, toDatetimeLocal } from '@/lib/utils';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export function AddDonation({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [foodName, setFoodName] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('');
  const [venueName, setVenueName] = useState('');
  const [category, setCategory] = useState('');
  const [isVegetarian, setIsVegetarian] = useState('veg');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('servings');
  const [preparationTime, setPreparationTime] = useState(toDatetimeLocal(new Date().toISOString()));
  const [collectionDeadline, setCollectionDeadline] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [storageInfo, setStorageInfo] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
  const eventTypeOptions = [
    { value: 'marriage', label: 'Marriage' },
    { value: 'birthday', label: 'Birthday Party' },
    { value: 'corporate', label: 'Corporate Event' },
    { value: 'temple', label: 'Temles Function' },
    { value: 'conference', label: 'Conference' },
    { value: 'restaurant', label: 'Restaurant Surplus' },
    { value: 'other', label: 'Other' },
  ];
  const unitOptions = [
    { value: 'servings', label: 'Servings' },
    { value: 'meals', label: 'Meals' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'boxes', label: 'Boxes' },
    { value: 'packs', label: 'Packs' },
  ];

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!foodName.trim()) e.foodName = 'Food name is required';
    if (!category) e.category = 'Please select a category';
    if (!quantity || parseInt(quantity) <= 0) e.quantity = 'Enter a valid quantity';
    if (!collectionDeadline) e.collectionDeadline = 'Safe consumption deadline is required';
    if (!pickupLocation.trim()) e.pickupLocation = 'Pickup location is required';
    const now = new Date();
    if (collectionDeadline && new Date(collectionDeadline) <= now) {
      e.collectionDeadline = 'Deadline must be in the future';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !profile) return;

    setLoading(true);
    const { error } = await supabase.from('food_donations').insert({
      donor_id: profile.id,
      food_name: foodName.trim(),
      category: category as FoodCategory,
      quantity: parseInt(quantity),
      quantity_unit: quantityUnit,
      preparation_time: fromDatetimeLocal(preparationTime),
      collection_deadline: fromDatetimeLocal(collectionDeadline),
      pickup_location: pickupLocation.trim(),
      description: description.trim() || null,
      storage_info: storageInfo.trim() || null,
      image_url: imageUrl.trim() || null,
      contact_info: contactInfo.trim() || null,
      event_name: eventName.trim() || null,
      event_type: eventType || null,
      venue_name: venueName.trim() || null,
      is_vegetarian: isVegetarian === 'veg',
      status: 'available',
    });

    setLoading(false);

    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Donation published successfully!', type: 'success' });
      setTimeout(() => onSuccess(), 1200);
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Food Donation</h1>
          <p className="text-sm text-gray-500">Publish your surplus food</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Food Name" value={foodName} onChange={setFoodName} required placeholder="e.g. Cooked Rice and Curry" error={errors.foodName} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Event Name (optional)" value={eventName} onChange={setEventName} placeholder="e.g. Sharma Wedding" />
          <Select label="Event Type" value={eventType} onChange={setEventType} options={eventTypeOptions} />
        </div>

        <Input label="Venue / Hall / Restaurant Name" value={venueName} onChange={setVenueName} placeholder="e.g. Grand Palace Hall" />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Food Category" value={category} onChange={setCategory} options={categoryOptions} required error={errors.category} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Food Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsVegetarian('veg')}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  isVegetarian === 'veg' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
                }`}
              >
                Vegetarian
              </button>
              <button
                type="button"
                onClick={() => setIsVegetarian('non-veg')}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  isVegetarian === 'non-veg' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'
                }`}
              >
                Non-Veg
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Quantity" type="number" value={quantity} onChange={setQuantity} required placeholder="50" min="1" error={errors.quantity} />
          <Select label="Unit" value={quantityUnit} onChange={setQuantityUnit} options={unitOptions} />
        </div>

        <Input label="Preparation Date & Time" type="datetime-local" value={preparationTime} onChange={setPreparationTime} required />

        <Input label="Safe Consumption Deadline" type="datetime-local" value={collectionDeadline} onChange={setCollectionDeadline} required error={errors.collectionDeadline} />

        <Input label="Pickup Location" value={pickupLocation} onChange={setPickupLocation} required placeholder="e.g. 123 Main Street, Downtown" error={errors.pickupLocation} />

        <Input label="Contact Information" value={contactInfo} onChange={setContactInfo} placeholder="Phone or WhatsApp number" />

        <Input label="Food Description" value={description} onChange={setDescription} multiline rows={3} placeholder="Describe the food items, ingredients, etc." />

        <Input label="Storage Information" value={storageInfo} onChange={setStorageInfo} multiline rows={2} placeholder="e.g. Keep refrigerated, store in cool dry place" />

        <Input label="Food Image URL (optional)" value={imageUrl} onChange={setImageUrl} placeholder="https://example.com/food-image.jpg" />

        {imageUrl && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <img src={imageUrl} alt="Food preview" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}

        <div className="bg-orange-50 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">Food Safety Reminder</p>
            <p className="text-xs text-orange-600 mt-1">Ensure food is safe for consumption and stored at proper temperatures. The preparation time is separate from the safe consumption deadline.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} type="button">Cancel</Button>
          <Button fullWidth type="submit" disabled={loading}>
            {loading ? 'Publishing...' : 'Publish Donation'}
          </Button>
        </div>
      </form>
    </div>
  );
}
