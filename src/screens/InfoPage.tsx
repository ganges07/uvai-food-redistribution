import { useState } from 'react';
import { Card } from '@/components/ui';
import { ChevronDown, HelpCircle, Shield, FileText, ArrowLeft } from 'lucide-react';

interface InfoPageProps {
  type: 'faq' | 'privacy';
  onBack: () => void;
}

export function InfoPage({ type, onBack }: InfoPageProps) {
  const [expanded, setExpanded] = useState<number | null>(0);

  const faqItems = [
    {
      q: 'What is UVAI?',
      a: 'UVAI is a smart food redistribution platform that connects restaurants, hotels, event organizers, and individuals who have surplus food with NGOs and charitable organizations that need food. Our goal is to reduce food waste and improve food redistribution.',
    },
    {
      q: 'How do I donate food?',
      a: 'Sign up as a Food Donor, then tap "Add Food Donation" from your dashboard. Fill in the food details, quantity, pickup location, and collection deadline. Your listing will appear in the marketplace for NGOs to discover.',
    },
    {
      q: 'How do I receive food?',
      a: 'Sign up as a Food Receiver, browse the marketplace for available food, and tap "Request This Food" on any listing. The donor will review your request and accept or reject it. You will be notified of the status.',
    },
    {
      q: 'Is the food really free?',
      a: 'Yes! All food on UVAI is donated free of charge. There is no payment involved. The platform is designed to facilitate food redistribution as a community service.',
    },
    {
      q: 'How does pickup work?',
      a: 'Once a reservation is accepted, the donor marks the food as "Ready for Pickup." The receiver collects the food from the specified pickup location. The donor then marks it as "Collected" and finally "Completed."',
    },
    {
      q: 'How do I contact a donor or receiver?',
      a: 'You can contact the other party through WhatsApp or phone call directly from the food detail page, if they have provided their contact information.',
    },
    {
      q: 'Is my information safe?',
      a: 'Yes. UVAI uses secure authentication and role-based access control. Your personal information is protected and only visible to other authenticated users on the platform. See our Privacy Policy for details.',
    },
  ];

  const privacySections = [
    {
      title: 'Privacy Policy',
      content: 'UVAI is committed to protecting your privacy. We collect only the information necessary to facilitate food redistribution: your name, email, phone number, organization details, and address. This information is visible to other authenticated users to enable food pickups and communication.',
    },
    {
      title: 'Data Collection',
      content: 'We collect: (1) Account information: name, email, password (hashed), role, and organization details. (2) Activity data: food donations you create, reservations you make, and notifications. (3) Communication data: messages attached to reservation requests.',
    },
    {
      title: 'Data Usage',
      content: 'Your data is used to: (1) Facilitate food donation and reservation processes. (2) Display contact information to relevant parties for pickup coordination. (3) Generate anonymous platform statistics for impact reporting. (4) Send in-app notifications about your activity.',
    },
    {
      title: 'Data Security',
      content: 'All data is stored securely with row-level security policies. Passwords are hashed using industry-standard algorithms. Access to your personal data is controlled by role-based permissions. Only you can edit your profile information.',
    },
    {
      title: 'Terms of Service',
      content: 'By using UVAI, you agree to: (1) Provide accurate information about yourself and your organization. (2) Ensure donated food is safe for consumption and properly stored. (3) Honor reservations and pickups in a timely manner. (4) Use the platform only for legitimate food redistribution purposes. (5) Not misuse or abuse the platform or other users.',
    },
    {
      title: 'Food Safety Disclaimer',
      content: 'UVAI is a platform that facilitates connections between donors and receivers. We do not verify the safety or quality of donated food. Donors are responsible for ensuring food is safe for consumption, and receivers should inspect food before consuming. UVAI is not liable for any food-related issues.',
    },
  ];

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {type === 'faq' ? 'FAQ & Help' : 'Privacy & Terms'}
          </h1>
          <p className="text-sm text-gray-500">
            {type === 'faq' ? 'Frequently asked questions' : 'Your privacy and our terms'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
          {type === 'faq' ? <HelpCircle className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
        </div>
      </div>

      <div className="space-y-2.5">
        {type === 'faq'
          ? faqItems.map((item, i) => (
              <Card key={i} className="overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-gray-900 text-sm pr-2">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${
                      expanded === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expanded === i && (
                  <p className="text-sm text-gray-600 mt-3 animate-fade-in">{item.a}</p>
                )}
              </Card>
            ))
          : privacySections.map((section, i) => (
              <Card key={i} className="overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600 shrink-0" />
                    <span className="font-medium text-gray-900 text-sm">{section.title}</span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${
                      expanded === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expanded === i && (
                  <p className="text-sm text-gray-600 mt-3 animate-fade-in">{section.content}</p>
                )}
              </Card>
            ))}
      </div>
    </div>
  );
}
