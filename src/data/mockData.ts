import { Person, MealEntry } from '../types';
import { getMondayOfWeek, getWeekId } from '../utils/dateUtils';

export const PREDEFINED_PEOPLE: Person[] = [
  { id: 'person-1', name: 'Shreyansh', shortName: 'SY', avatarColor: '#0000FD', accentColor: 'bg-blue-600', role: 'Group Member' },
  { id: 'person-2', name: 'Shreshth', shortName: 'ST', avatarColor: '#3b82f6', accentColor: 'bg-sky-600', role: 'Group Member' },
  { id: 'person-3', name: 'Yashmeet', shortName: 'YM', avatarColor: '#6366f1', accentColor: 'bg-indigo-600', role: 'Group Member' },
  { id: 'person-4', name: 'Aadi', shortName: 'AA', avatarColor: '#0284c7', accentColor: 'bg-cyan-600', role: 'Group Member' },
  { id: 'person-5', name: 'Mudit', shortName: 'MD', avatarColor: '#2563eb', accentColor: 'bg-blue-700', role: 'Group Member' },
  { id: 'person-6', name: 'Vihaan', shortName: 'VH', avatarColor: '#4f46e5', accentColor: 'bg-indigo-700', role: 'Group Member' },
  { id: 'person-7', name: 'Pravar', shortName: 'PR', avatarColor: '#0d9488', accentColor: 'bg-teal-600', role: 'Group Member' },
  { id: 'person-8', name: 'Atiksh', shortName: 'AT', avatarColor: '#0891b2', accentColor: 'bg-cyan-700', role: 'Group Member' },
  { id: 'person-9', name: 'Arin', shortName: 'AR', avatarColor: '#4338ca', accentColor: 'bg-indigo-800', role: 'Group Member' },
];

// Total weekly slots and member counts
export const TOTAL_MEAL_SLOTS_PER_WEEK = 14;
export const GROUP_SIZE = 9;
export const BONUS_DECISIONS_PER_WEEK = 5;

// Generate realistic sample meals for the current week
export function generateInitialMeals(): MealEntry[] {
  const currentMonday = getMondayOfWeek(0);
  const currentWeekId = getWeekId(currentMonday);

  const getDayDateStr = (dayOffset: number) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'meal-sample-1',
      weekId: currentWeekId,
      day: 'monday',
      dateStr: getDayDateStr(0),
      mealType: 'dinner',
      title: 'Grilled Salmon with Lemon & Asparagus',
      notes: 'Served with roasted garlic baby potatoes and lemon-dill butter.',
      tags: ['High Protein', 'Gluten Free', 'Homemade'],
      decidedByPersonId: 'person-2',
      decidedByPersonName: 'Shreshth',
      isLocked: true,
      lockedAt: '2026-09-06T14:30:00Z',
    },
    {
      id: 'meal-sample-2',
      weekId: currentWeekId,
      day: 'tuesday',
      dateStr: getDayDateStr(1),
      mealType: 'breakfast_lunch',
      title: 'Artisan Avocado Toast & Poached Eggs',
      notes: 'Sourdough bread, chili flakes, feta crumbles, and microgreens.',
      tags: ['Brunch', 'Vegetarian'],
      decidedByPersonId: 'person-4',
      decidedByPersonName: 'Aadi',
      isLocked: true,
      lockedAt: '2026-09-06T17:15:00Z',
    },
    {
      id: 'meal-sample-3',
      weekId: currentWeekId,
      day: 'wednesday',
      dateStr: getDayDateStr(2),
      mealType: 'dinner',
      title: 'Thai Basil Chicken with Jasmine Rice',
      notes: 'Medium spicy, with crispy fried egg on top.',
      tags: ['Asian Cuisine', 'Spicy', 'Group Favorite'],
      decidedByPersonId: 'person-7',
      decidedByPersonName: 'Pravar',
      isLocked: true,
      lockedAt: '2026-09-07T09:10:00Z',
    },
    {
      id: 'meal-sample-4',
      weekId: currentWeekId,
      day: 'friday',
      dateStr: getDayDateStr(4),
      mealType: 'dinner',
      title: 'Artisanal Neapolitan Pizza Night',
      notes: 'Margherita, Diavola, and Truffle Mushroom pizzas from local wood-fired oven.',
      tags: ['Italian', 'Takeout', 'Pizza Night'],
      decidedByPersonId: 'person-1',
      decidedByPersonName: 'Shreyansh',
      isLocked: true,
      lockedAt: '2026-09-07T11:00:00Z',
    },
    {
      id: 'meal-sample-5',
      weekId: currentWeekId,
      day: 'saturday',
      dateStr: getDayDateStr(5),
      mealType: 'dinner',
      title: 'Korean BBQ Beef Bulgogi Bowls',
      notes: 'Marinated beef ribeye, kimchi, pickled daikon, and scallion rice.',
      tags: ['Korean', 'Hearty'],
      decidedByPersonId: 'person-5',
      decidedByPersonName: 'Mudit',
      isLocked: true,
      lockedAt: '2026-09-07T12:45:00Z',
    },
  ];
}

export const POPULAR_MEAL_SUGGESTIONS = [
  'Paneer Butter Masala',
  'Kadai Paneer',
  'Palak Paneer',
  'Shahi Paneer',
  'Chole',
  'Rajma Masala',
  'Dal Makhani',
  'Dal Tadka',
  'Aloo Gobi',
  'Malai Kofta',
  'Matar Paneer',
  'Veg Kofta Curry',
];
