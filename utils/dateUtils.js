export const timeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return interval + 'y ago';
    }
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval + 'mo ago';
    }
    interval = Math.floor(seconds / 86400); // days
    if (interval >= 1) {
        if (interval === 1) return 'Yesterday';
        return interval + 'd ago';
    }
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval + 'h ago';
    }
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval + 'm ago';
    }
    return 'Just now';
};

export const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
