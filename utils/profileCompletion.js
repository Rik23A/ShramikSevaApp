/**
 * Profile Completion Calculation Utility
 * Accurately determines profile completion percentage, completed steps,
 * missing items, and next recommended actions for Workers and Employers.
 */

/**
 * Calculates profile completion for a user
 * @param {Object} user - User object from AuthContext / API
 * @returns {Object} Completion details
 */
export const calculateProfileCompletion = (user) => {
    if (!user) {
        return {
            percentage: 0,
            isComplete: false,
            completedCount: 0,
            totalCount: 0,
            steps: [],
            missingSteps: [],
            nextStep: null,
            color: '#EF4444',
        };
    }

    const isWorker = user.role === 'worker';
    const steps = isWorker ? getWorkerSteps(user) : getEmployerSteps(user);

    let earnedWeight = 0;
    let totalWeight = 0;
    const missingSteps = [];
    const completedSteps = [];

    steps.forEach((step) => {
        totalWeight += step.weight;
        if (step.isDone) {
            earnedWeight += step.weight;
            completedSteps.push(step);
        } else {
            missingSteps.push(step);
        }
    });

    const percentage = Math.min(100, Math.round((earnedWeight / totalWeight) * 100));
    const isComplete = percentage === 100 || Boolean(user.isProfileComplete || user.companyDetails?.isProfileComplete);

    // Dynamic color coding
    let color = '#EF4444'; // Red for < 45%
    if (percentage >= 80) {
        color = '#10B981'; // Emerald Green for >= 80%
    } else if (percentage >= 45) {
        color = '#F59E0B'; // Amber Orange for 45% - 79%
    }

    return {
        percentage: isComplete ? 100 : percentage,
        isComplete,
        completedCount: completedSteps.length,
        totalCount: steps.length,
        steps,
        completedSteps,
        missingSteps,
        nextStep: missingSteps.length > 0 ? missingSteps[0] : null,
        color,
    };
};

/**
 * Worker profile evaluation steps (Total = 100%)
 */
/**
 * Worker profile evaluation steps (Total = 100%)
 */
const getWorkerSteps = (user) => {
    const hasNameAndPhone = Boolean(user.name && (user.mobile || user.phone));
    const hasPhoto = Boolean(user.profilePicture);
    const hasAge = Boolean(user.age && Number(user.age) >= 14);
    const hasQualification = Boolean(user.qualification && typeof user.qualification === 'string' && user.qualification.trim().length > 0);
    const hasLanguages = Boolean(Array.isArray(user.languages) && user.languages.length > 0);
    const hasTrade = Array.isArray(user.workerType) ? user.workerType.length > 0 : Boolean(user.workerType);
    const hasSkills = Array.isArray(user.skills) ? user.skills.length > 0 : Boolean(user.skills);
    const hasLocation = Boolean(
        user.city ||
        user.location?.city ||
        user.locationName ||
        user.state ||
        (user.location?.coordinates && user.location.coordinates.length === 2 && (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0))
    );
    const hasExpOrBio = Boolean(
        user.isFresher ||
        (user.experience !== undefined && user.experience !== null && Number(user.experience) > 0) ||
        (typeof user.bio === 'string' && user.bio.trim().length > 0)
    );
    const hasDocuments = Boolean(
        (Array.isArray(user.documents) && user.documents.length > 0) ||
        user.hasUploadedDocs
    );

    return [
        {
            id: 'basic_info',
            title: 'Full Name & Mobile',
            titleKey: 'step_basic_info',
            actionKey: 'step_basic_info_action',
            weight: 10,
            isDone: hasNameAndPhone,
            icon: 'person-outline',
            action: 'Edit Basic Info',
        },
        {
            id: 'profile_photo',
            title: 'Profile Photo',
            titleKey: 'step_profile_photo',
            actionKey: 'step_profile_photo_action',
            weight: 10,
            isDone: hasPhoto,
            icon: 'camera-outline',
            action: 'Add Photo',
        },
        {
            id: 'age',
            title: 'Age',
            titleKey: 'step_age',
            actionKey: 'step_age_action',
            weight: 5,
            isDone: hasAge,
            icon: 'calendar-outline',
            action: 'Add Age',
        },
        {
            id: 'qualification',
            title: 'Highest Qualification',
            titleKey: 'step_qualification',
            actionKey: 'step_qualification_action',
            weight: 10,
            isDone: hasQualification,
            icon: 'school-outline',
            action: 'Add Qualification',
        },
        {
            id: 'languages',
            title: 'Languages Known',
            titleKey: 'step_languages',
            actionKey: 'step_languages_action',
            weight: 10,
            isDone: hasLanguages,
            icon: 'chatbubbles-outline',
            action: 'Select Languages',
        },
        {
            id: 'trade',
            title: 'Job Trade / Category',
            titleKey: 'step_trade',
            actionKey: 'step_trade_action',
            weight: 15,
            isDone: hasTrade,
            icon: 'briefcase-outline',
            action: 'Select Trade',
        },
        {
            id: 'skills',
            title: 'Key Skills',
            titleKey: 'step_skills',
            actionKey: 'step_skills_action',
            weight: 15,
            isDone: hasSkills,
            icon: 'construct-outline',
            action: 'Add Skills',
        },
        {
            id: 'location',
            title: 'City & Location',
            titleKey: 'step_location',
            actionKey: 'step_location_action',
            weight: 10,
            isDone: hasLocation,
            icon: 'location-outline',
            action: 'Set Location',
        },
        {
            id: 'experience',
            title: 'Experience / Bio',
            titleKey: 'step_experience',
            actionKey: 'step_experience_action',
            weight: 10,
            isDone: hasExpOrBio,
            icon: 'document-text-outline',
            action: 'Add Experience',
        },
        {
            id: 'documents',
            title: 'ID / Trade Certificate',
            titleKey: 'step_documents',
            actionKey: 'step_documents_action',
            weight: 5,
            isDone: hasDocuments,
            icon: 'shield-checkmark-outline',
            action: 'Upload ID Document',
        },
    ];
};

/**
 * Employer profile evaluation steps (Total = 100%)
 */
const getEmployerSteps = (user) => {
    const details = user.companyDetails || {};

    const hasNameAndPhone = Boolean(user.name && (user.mobile || user.phone));
    const hasCompanyName = Boolean(user.companyName || details.companyName);
    const hasPhoto = Boolean(user.profilePicture);
    const hasBusinessDetails = Boolean(user.businessType || details.businessType || details.description);
    const hasAddress = Boolean(
        user.city ||
        details.address?.city ||
        details.address?.street ||
        details.address?.pincode ||
        user.locationName
    );
    const hasEmail = Boolean(user.email);
    const hasDocs = Boolean(
        user.gstNumber ||
        details.gstNumber ||
        details.documents?.gstCertificate ||
        details.documents?.panCard ||
        (Array.isArray(user.documents) && user.documents.length > 0) ||
        (Array.isArray(details.documents) && details.documents.length > 0)
    );

    return [
        {
            id: 'contact_info',
            title: 'Contact Name & Mobile',
            titleKey: 'step_contact_info',
            actionKey: 'step_contact_info_action',
            weight: 15,
            isDone: hasNameAndPhone,
            icon: 'person-outline',
            action: 'Edit Contact Details',
        },
        {
            id: 'company_name',
            title: 'Company / Business Name',
            titleKey: 'step_company_name',
            actionKey: 'step_company_name_action',
            weight: 20,
            isDone: hasCompanyName,
            icon: 'business-outline',
            action: 'Add Company Name',
        },
        {
            id: 'logo',
            title: 'Company Logo / Photo',
            titleKey: 'step_logo',
            actionKey: 'step_logo_action',
            weight: 15,
            isDone: hasPhoto,
            icon: 'image-outline',
            action: 'Add Logo',
        },
        {
            id: 'business_type',
            title: 'Industry & Description',
            titleKey: 'step_business_type',
            actionKey: 'step_business_type_action',
            weight: 15,
            isDone: hasBusinessDetails,
            icon: 'information-circle-outline',
            action: 'Add Description',
        },
        {
            id: 'address',
            title: 'Office City & Address',
            titleKey: 'step_address',
            actionKey: 'step_address_action',
            weight: 15,
            isDone: hasAddress,
            icon: 'location-outline',
            action: 'Set Address',
        },
        {
            id: 'email',
            title: 'Official Email',
            titleKey: 'step_email',
            actionKey: 'step_email_action',
            weight: 10,
            isDone: hasEmail,
            icon: 'mail-outline',
            action: 'Add Email',
        },
        {
            id: 'verification_docs',
            title: 'GST / PAN Certificate',
            titleKey: 'step_verification_docs',
            actionKey: 'step_verification_docs_action',
            weight: 10,
            isDone: hasDocs,
            icon: 'shield-checkmark-outline',
            action: 'Upload Documents',
        },
    ];
};
