
/**
 * 检测到的本地 AI 服务信息
 */
export interface DetectedService {
    id: string;
    name: string;
    available: boolean;
    baseUrl: string;
    models?: string[];
    isFree: boolean;
    isLocal: boolean;
    priority: number; // 推荐优先级，数字越小优先级越高
}

/**
 * 环境检测结果
 */
export interface EnvironmentDetectionResult {
    localServices: DetectedService[];
    recommendedProvider: DetectedService | null;
    hasLocalService: boolean;
    timestamp: number;
}

/**
 * 快速开始模板定义
 */
export interface QuickStartTemplate {
    id: string;
    nameKey: string;
    descriptionKey: string;
    providerId: string;
    config: Record<string, unknown>;
    isFree: boolean;
    requiresApiKey: boolean;
    badge?: "recommended" | "free" | "local" | "fastest";
}

/**
 * 环境检测服务 - 检测本地 AI 服务并提供智能推荐
 */
export class EnvironmentDetectorService {
    private static instance: EnvironmentDetectorService;
    private cachedResult: EnvironmentDetectionResult | null = null;
    private readonly cacheTimeout = 60000; // 1分钟缓存

    private constructor() { }

    /**
     * 获取单例实例
     */
    public static getInstance(): EnvironmentDetectorService {
        if (!EnvironmentDetectorService.instance) {
            EnvironmentDetectorService.instance = new EnvironmentDetectorService();
        }
        return EnvironmentDetectorService.instance;
    }

    /**
     * 检测本地 AI 服务
     */
    public async detectLocalServices(): Promise<EnvironmentDetectionResult> {
        // 检查缓存是否有效
        if (
            this.cachedResult &&
            Date.now() - this.cachedResult.timestamp < this.cacheTimeout
        ) {
            return this.cachedResult;
        }

        const localServices: DetectedService[] = [];

        // 并行检测所有本地服务
        const detections = await Promise.allSettled([
            this.detectOllama(),
            this.detectLMStudio(),
        ]);

        for (const result of detections) {
            if (result.status === "fulfilled" && result.value) {
                localServices.push(result.value);
            }
        }

        // 按优先级排序
        localServices.sort((a, b) => a.priority - b.priority);

        const result: EnvironmentDetectionResult = {
            localServices,
            recommendedProvider:
                localServices.find((s) => s.available) || null,
            hasLocalService: localServices.some((s) => s.available),
            timestamp: Date.now(),
        };

        this.cachedResult = result;
        return result;
    }

    /**
     * 检测 Ollama 服务
     */
    private async detectOllama(): Promise<DetectedService | null> {
        const baseUrl = "http://localhost:11434";
        const service: DetectedService = {
            id: "ollama",
            name: "Ollama",
            available: false,
            baseUrl,
            isFree: true,
            isLocal: true,
            priority: 1,
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${baseUrl}/api/tags`, {
                method: "GET",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                service.available = true;
                try {
                    const data = await response.json();
                    if (data.models && Array.isArray(data.models)) {
                        service.models = data.models.map((m: { name: string }) => m.name);
                    }
                } catch {
                    // 忽略 JSON 解析错误
                }
            }
        } catch {
            // Ollama 不可用
        }

        return service;
    }

    /**
     * 检测 LM Studio 服务
     */
    private async detectLMStudio(): Promise<DetectedService | null> {
        const baseUrl = "http://localhost:1234";
        const service: DetectedService = {
            id: "lmstudio",
            name: "LM Studio",
            available: false,
            baseUrl,
            isFree: true,
            isLocal: true,
            priority: 2,
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${baseUrl}/v1/models`, {
                method: "GET",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                service.available = true;
                try {
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        service.models = data.data.map((m: { id: string }) => m.id);
                    }
                } catch {
                    // 忽略 JSON 解析错误
                }
            }
        } catch {
            // LM Studio 不可用
        }

        return service;
    }

    /**
     * 获取快速开始模板列表
     */
    public async getQuickStartTemplates(): Promise<QuickStartTemplate[]> {
        const detection = await this.detectLocalServices();

        const templates: QuickStartTemplate[] = [];

        // 如果检测到本地 Ollama，优先推荐
        if (detection.localServices.find((s) => s.id === "ollama" && s.available)) {
            templates.push({
                id: "local-ollama",
                nameKey: "templates.ollama.name",
                descriptionKey: "templates.ollama.description",
                providerId: "ollama",
                config: {
                    baseUrl: "http://localhost:11434",
                },
                isFree: true,
                requiresApiKey: false,
                badge: "local",
            });
        }

        // 如果检测到 LM Studio
        if (
            detection.localServices.find((s) => s.id === "lmstudio" && s.available)
        ) {
            templates.push({
                id: "local-lmstudio",
                nameKey: "templates.lmstudio.name",
                descriptionKey: "templates.lmstudio.description",
                providerId: "lmstudio",
                config: {
                    baseUrl: "http://localhost:1234/v1",
                },
                isFree: true,
                requiresApiKey: false,
                badge: "local",
            });
        }

        // 免费云服务模板
        templates.push(
            {
                id: "cloud-gemini-free",
                nameKey: "templates.gemini.name",
                descriptionKey: "templates.gemini.description",
                providerId: "gemini",
                config: {
                    model: "gemini-1.5-flash",
                },
                isFree: true,
                requiresApiKey: true,
                badge: "free",
            },
            {
                id: "cloud-zhipu-free",
                nameKey: "templates.zhipu.name",
                descriptionKey: "templates.zhipu.description",
                providerId: "zhipu",
                config: {
                    model: "glm-4-flash",
                },
                isFree: true,
                requiresApiKey: true,
                badge: "free",
            },
            {
                id: "cloud-deepseek",
                nameKey: "templates.deepseek.name",
                descriptionKey: "templates.deepseek.description",
                providerId: "deepseek",
                config: {
                    model: "deepseek-chat",
                },
                isFree: false,
                requiresApiKey: true,
                badge: "recommended",
            },
            {
                id: "cloud-openai",
                nameKey: "templates.openai.name",
                descriptionKey: "templates.openai.description",
                providerId: "openai",
                config: {
                    model: "gpt-4o-mini",
                },
                isFree: false,
                requiresApiKey: true,
            }
        );

        // 如果有本地服务，将第一个本地模板标记为推荐
        if (templates.length > 0 && templates[0].badge === "local") {
            templates[0].badge = "recommended";
        }

        return templates;
    }

    /**
     * 清除缓存
     */
    public clearCache(): void {
        this.cachedResult = null;
    }

    /**
     * 获取智能推荐的提供商
     */
    public async getRecommendedProvider(): Promise<string | null> {
        const detection = await this.detectLocalServices();

        // 优先推荐本地服务
        if (detection.recommendedProvider) {
            return detection.recommendedProvider.id;
        }

        // 没有本地服务时，推荐免费的云服务
        return "gemini"; // Gemini 有每日免费额度
    }
}
