
export interface UsageStats {
    date: string;
    count: number;
}

const USAGE_KEY = 'ai_chat_usage_stats';
const DAILY_LIMIT = 20; // Allow 20 free messages per day

export const getUsageStats = (): UsageStats => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(USAGE_KEY);

    if (stored) {
        const parsed: UsageStats = JSON.parse(stored);
        if (parsed.date === today) {
            return parsed;
        }
    }

    return { date: today, count: 0 };
};

export const incrementUsage = () => {
    const stats = getUsageStats();
    stats.count += 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
};

export const isUsageLimitReached = (): boolean => {
    const stats = getUsageStats();
    return stats.count >= DAILY_LIMIT;
};

export const getRemainingMessages = (): number => {
    const stats = getUsageStats();
    return Math.max(0, DAILY_LIMIT - stats.count);
};
