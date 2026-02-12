// Environment configuration for Shramik Seva App
// Change API_URL based on your testing environment:
// - Web Browser: http://localhost:5000/api
// - Android Emulator: http://10.0.2.2:5000/api
// - Physical Device: http://YOUR_MACHINE_IP:5000/api
// - Production: https://your-production-url.com/api

export const API_URL = 'http://192.168.1.4:5000/api';

// Worker Types & Skills Mapping (Synced with Web)
export const WORKER_SKILLS = {
    "Security guards": [
        "Access Control", "Visitor Management", "Patrolling", "CCTV Monitoring", "Surveillance", "Incident Reporting", "Emergency Response", "Crowd Control", "Conflict Management", "Fire Safety Awareness", "Alarm Systems Handling", "Security Protocols", "Shift Management", "Team Supervision", "Risk Assessment", "Incident Investigation", "Report Writing", "Communication Skills", "Physical Fitness", "First Aid", "SOP Compliance"
    ],
    "Security Supervisor": [
        "Access Control", "Visitor Management", "Patrolling", "CCTV Monitoring", "Surveillance", "Incident Reporting", "Emergency Response", "Crowd Control", "Conflict Management", "Fire Safety Awareness", "Alarm Systems Handling", "Security Protocols", "Shift Management", "Team Supervision", "Risk Assessment", "Incident Investigation", "Report Writing", "Communication Skills", "Physical Fitness", "First Aid", "SOP Compliance"
    ],
    "Housekeepers": [
        "Cleaning & Sanitization", "Floor Cleaning", "Washroom Cleaning", "Waste Management", "Linen Handling", "Chemical Handling", "Housekeeping Equipment Operation", "Room Maintenance", "Deep Cleaning", "Hygiene Standards", "Inventory Management", "Time Management", "Attention to Detail"
    ],
    "Facility Manager": [
        "Facility Operations", "Maintenance Planning", "Vendor Management", "Asset Management", "Preventive Maintenance", "HVAC Knowledge", "Electrical & Plumbing Basics", "Budgeting", "Safety Compliance", "AMC Management", "Team Coordination", "Space Management", "Soft Services Management", "Hard Services Management", "SLA Monitoring", "Documentation"
    ],
    "Electricians": [
        "Wiring Installation", "Electrical Maintenance", "Panel Board Handling", "Circuit Breaker Installation", "Fault Detection", "Electrical Repair", "Power Tools Usage", "Load Calculation", "Earthing", "Lighting Systems", "Industrial Electrical Work", "Residential Electrical Work", "Safety Compliance", "Multimeter Usage"
    ],
    "Plumbers": [
        "Pipe Fitting", "Leakage Detection", "Drainage Systems", "Water Supply Systems", "Sanitary Installation", "Tap & Valve Repair", "Bathroom Fittings", "Sewage Systems", "Plumbing Tools Usage", "Pressure Testing", "Maintenance & Repair", "Blueprint Reading"
    ],
    "Liftman": [
        "Elevator Operation", "Passenger Assistance", "Safety Procedures", "Emergency Handling", "Lift Controls Knowledge", "Daily Lift Checks", "Communication Skills", "Crowd Handling", "Basic Troubleshooting", "SOP Compliance"
    ],
    "Fireman": [
        "Fire Fighting", "Fire Extinguisher Handling", "Fire Alarm Systems", "Emergency Evacuation", "Rescue Operations", "Fire Safety Inspection", "Disaster Management", "First Aid, PPE Handling", "Risk Assessment", "Incident Reporting"
    ],
    "Gardener": [
        "Plant Care", "Lawn Maintenance", "Pruning", "Landscaping", "Irrigation Systems", "Fertilization", "Pest Control", "Soil Preparation", "Gardening Tools Usage", "Nursery Management", "Seasonal Plantation", "Outdoor Maintenance"
    ],
    "Pantry Boy": [
        "Pantry Management", "Tea & Coffee Preparation", "Food Hygiene", "Utensil Cleaning", "Stock Replenishment", "Office Service Etiquette", "Time Management", "Basic Cooking", "Waste Disposal", "Cleanliness Maintenance"
    ],
    "Nurse": [
        "Patient Care", "Vital Signs Monitoring", "Medication Administration", "Wound Dressing", "Injection Handling", "IV Management", "Patient Hygiene Care", "Medical Documentation", "Emergency Care", "Infection Control", "Equipment Handling", "Compassionate Care"
    ],
    "Aya": [
        "Patient Assistance", "Elderly Care", "Child Care", "Bedside Assistance", "Feeding Support", "Hygiene Maintenance", "Mobility Support", "Basic First Aid", "Emotional Support", "Cleanliness Maintenance"
    ],
    "Carpenters": [
        "Wood Cutting", "Furniture Making", "Installation Work", "Repair & Maintenance", "Measurement & Marking", "Blueprint Reading", "Modular Furniture Assembly, Power Tools Usage", "Polishing & Finishing", "Safety Practices"
    ],
    "Welders": [
        "Arc Welding", "Gas Welding", "MIG Welding", "TIG Welding", "Fabrication Work", "Metal Cutting", "Blueprint Reading", "Welding Equipment Handling", "Safety Procedures", "Structural Welding", "Repair Welding"
    ],
    "Electronic mechanic": [
        "Electronic Repair", "Circuit Analysis", "PCB Repair", "Soldering", "Electronic Testing", "Troubleshooting", "Component Replacement", "Use of Testing Instruments", "Consumer Electronics Repair", "Industrial Electronics Basics"
    ],
    "Motor mechanic": [
        "Engine Repair", "Vehicle Maintenance", "Brake Systems", "Clutch Repair", "Transmission Systems", "Electrical Diagnostics", "Oil Change", "Suspension Systems", "Vehicle Inspection", "Tool Handling", "Fault Diagnosis"
    ],
    "Swimming trainer": [
        "Swimming Instruction", "Water Safety", "Lifesaving Techniques", "CPR", "Stroke Training", "Beginner Coaching", "Advanced Coaching", "Pool Safety Rules", "Fitness Training", "Child Training", "Adult Training"
    ],
    "WTP / STP operator": [
        "Water Treatment Process", "Sewage Treatment Process", "Chemical Dosing", "Pump Operation", "Valve Operation", "Plant Monitoring", "Water Quality Testing", "Equipment Maintenance", "Safety Compliance", "Log Book Maintenance", "Process Optimization"
    ],
    "Accountant": [
        "Bookkeeping", "Tally", "GST Filing", "Taxation", "Payroll Management", "Financial Reporting", "Balance Sheet Preparation", "Accounts Receivable", "Accounts Payable", "Audit Support", "Excel Skills", "Compliance Management"
    ],
    "Rajmistri (Masons)": [
        "Bricklaying", "Plastering", "Concreting", "Tiling", "Stone Masonry", "Blueprint Reading", "Material Estimation", "Safety Practices", "Finishing Work", "Formwork"
    ],
    "Any skilled/unskilled workers": [
        "General Maintenance", "Helper Work", "Machine Operation", "Manual Labor", "Cleaning Assistance", "Tool Handling", "Safety Awareness", "Basic Electrical Knowledge", "Basic Plumbing Knowledge", "Team Support", "Physical Work"
    ]
};

// Auto-generate WORKER_TYPES from keys
export const WORKER_TYPES = Object.keys(WORKER_SKILLS);

// Work types
export const WORK_TYPES = ['permanent', 'temporary'];

// Availability statuses
export const AVAILABILITY = ['available', 'unavailable'];

// Business Types for Employer Registration (WorkIndia Style)
export const BUSINESS_TYPES = [
    'IT/Software',
    'Manufacturing',
    'Construction',
    'Retail',
    'Hospitality',
    'Healthcare',
    'Education',
    'Transportation',
    'Real Estate',
    'Staffing Agency',
    'Other'
];

// Employee Count Ranges
export const EMPLOYEE_COUNTS = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '500+'
];

// Indian States
export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Jammu and Kashmir', 'Ladakh'
];

// App Colors - Blue Theme for Job Holders
export const COLORS = {
    // Primary Blue Palette
    primary: '#1976D2',
    primaryDark: '#1565C0',
    primaryLight: '#42A5F5',
    primaryGradientStart: '#1976D2',
    primaryGradientEnd: '#2196F3',

    // Secondary & Accent
    secondary: '#0D47A1',
    accent: '#64B5F6',

    // Status Colors
    success: '#4CAF50',
    successLight: '#E8F5E9',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    danger: '#F44336',
    dangerLight: '#FFEBEE',
    info: '#03A9F4',
    infoLight: '#E1F5FE',

    // Background & Surface
    background: '#F5F8FC',
    backgroundDark: '#E8EEF5',
    card: '#FFFFFF',
    cardElevated: '#FAFCFF',

    // Text Colors
    text: '#1A1A2E',
    textSecondary: '#64748B',
    textLight: '#94A3B8',
    textOnPrimary: '#FFFFFF',

    // Border & Divider
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#E8EEF5',

    // Common
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // WhatsApp Colors
    whatsappGreen: '#075E54',
    whatsappGreenLight: '#128C7E',
    whatsappTeal: '#25D366',
    whatsappBlue: '#53BDEB',

    // Gradient Colors
    gradientBlue: ['#1976D2', '#2196F3', '#42A5F5'],
    gradientSuccess: ['#43A047', '#66BB6A'],
    gradientDanger: ['#E53935', '#EF5350'],
};

export const FONTS = {
    regular: 'System',
    medium: 'System',
    bold: 'System',
};
