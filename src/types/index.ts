export type UserRole = 'donor' | 'acceptor' | 'volunteer' | 'hall' | 'admin';

export type FoodCategory =
  | 'prepared_meals'
  | 'raw_ingredients'
  | 'bakery'
  | 'dairy'
  | 'produce'
  | 'beverages'
  | 'other';

export type FoodStatus =
  | 'available'
  | 'requested'
  | 'accepted'
  | 'assigned'
  | 'ready_for_pickup'
  | 'collected'
  | 'delivered'
  | 'completed'
  | 'expired';

export type ReservationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type DeliveryStatus = 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export type NotificationType =
  | 'reservation_request'
  | 'reservation_status'
  | 'donation_update'
  | 'delivery_update'
  | 'volunteer_assigned'
  | 'event_scheduled'
  | 'system'
  | 'feedback';

export type FeedbackType = 'platform' | 'donation' | 'pickup';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  organization_name: string | null;
  organization_type: string | null;
  address: string | null;
  avatar_url: string | null;
  whatsapp_number: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodDonation {
  id: string;
  donor_id: string;
  food_name: string;
  category: FoodCategory;
  quantity: number;
  quantity_unit: string;
  preparation_time: string;
  collection_deadline: string;
  pickup_location: string;
  description: string | null;
  storage_info: string | null;
  image_url: string | null;
  status: FoodStatus;
  reserved_by: string | null;
  acceptor_id: string | null;
  volunteer_id: string | null;
  volunteer_assigned_at: string | null;
  delivery_completed_at: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  location_updated_at: string | null;
  event_name: string | null;
  event_type: string | null;
  venue_name: string | null;
  is_vegetarian: boolean;
  contact_info: string | null;
  created_at: string;
  updated_at: string;
  donor?: Profile;
  acceptor?: Profile;
  volunteer?: Profile;
}

export interface Reservation {
  id: string;
  food_donation_id: string;
  receiver_id: string;
  status: ReservationStatus;
  message: string | null;
  requested_quantity: number;
  delivery_id: string | null;
  created_at: string;
  updated_at: string;
  food_donation?: FoodDonation;
  receiver?: Profile;
}

export interface Delivery {
  id: string;
  food_post_id: string;
  volunteer_id: string | null;
  acceptor_id: string;
  status: DeliveryStatus;
  pickup_location: string;
  destination_location: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  location_updated_at: string | null;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  food_donation?: FoodDonation;
  volunteer?: Profile;
  acceptor?: Profile;
}

export interface ScheduledEvent {
  id: string;
  organizer_id: string;
  venue_name: string;
  venue_type: string;
  event_name: string;
  event_type: string;
  event_date: string;
  expected_attendance: number;
  expected_meals: number | null;
  expected_categories: string | null;
  meal_time: string | null;
  location: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  organizer?: Profile;
}

export interface AIPrediction {
  id: string;
  user_id: string;
  venue_name: string;
  event_type: string;
  expected_attendance: number;
  expected_meals: number | null;
  predicted_leftover_min: number;
  predicted_leftover_max: number;
  predicted_leftover_avg: number;
  risk_level: string;
  recommendation: string | null;
  actual_leftover: number | null;
  is_preliminary: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  feedback_type: FeedbackType;
  related_id: string | null;
  created_at: string;
  user?: Profile;
}

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  prepared_meals: 'Prepared Meals',
  raw_ingredients: 'Raw Ingredients',
  bakery: 'Bakery',
  dairy: 'Dairy',
  produce: 'Produce',
  beverages: 'Beverages',
  other: 'Other',
};

export const STATUS_LABELS: Record<FoodStatus, string> = {
  available: 'Available',
  requested: 'Requested',
  accepted: 'Accepted',
  assigned: 'Assigned to Volunteer',
  ready_for_pickup: 'Ready for Pickup',
  collected: 'Collected',
  delivered: 'Delivered',
  completed: 'Completed',
  expired: 'Expired',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  donor: 'Food Donor',
  acceptor: 'Food Acceptor',
  volunteer: 'Volunteer',
  hall: 'Hall / Temple',
  admin: 'Administrator',
};

export const ROLE_DESCRIPTIONS: Record<Exclude<UserRole, 'admin'>, string> = {
  donor: 'Donate surplus food from events, restaurants, or home',
  acceptor: 'Find and request available food for your organization',
  volunteer: 'Collect and deliver food to those in need',
  hall: 'Schedule events and plan food redistribution',
};
