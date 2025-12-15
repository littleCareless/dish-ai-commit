/**
 * 百度千帆API错误处理工具
 * 根据官方错误码文档提供友好的错误消息和排查建议
 * 文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/s/error-codes
 */

/**
 * 百度千帆错误响应格式
 */
interface QianfanErrorResponse {
    code?: string;
    message?: string;
    type?: string;
    status?: number;
}

/**
 * 错误码到用户友好消息的映射表
 */
const ERROR_MESSAGES: Record<string, string> = {
    // 400 错误
    malformed_json: "请求格式错误：JSON格式不正确",
    invalid_model: "模型参数错误：未指定或不存在的模型",
    invalid_messages: "消息格式错误：请检查消息内容是否符合规范",
    characters_too_long: "输入内容过长：超过模型支持的最大字符数限制",
    tokens_too_long: "输入tokens过长：请适当缩短输入内容",
    invalid_argument: "参数错误：请检查请求参数",
    invalid_image_genration_prompt: "图片生成prompt不合法",
    invalid_image_genration_refer_image: "参考图不合法",
    invalid_image_url: "图像尺寸超出限制：需小于6000px*6000px，最短边不低于5px",
    invalid_plugin_argument: "插件参数错误",

    // 401 错误
    no_parameter_permission: "权限不足：请检查您的权限配置",
    invalid_appid: "AppID鉴权失败：没有使用该AppID的权限",
    invalid_iam_token: "API Key鉴权失败：请检查API Key是否正确或已过期",

    // 403 错误
    system_unsafe: "system字段内容不安全：被安全审核拦截",
    user_setting_unsafe: "user_setting内容不合法：被安全审核拦截",
    functions_unsafe: "functions内容不合法：被安全审核拦截",

    // 405 错误
    method_not_supported: "请求方法错误：此接口仅支持POST请求",

    // 429 限流错误
    rpm_rate_limit_exceeded: "RPM配额超限：请求频率过高，请稍后重试",
    tpm_rate_limit_exceeded: "TPM配额超限：请求token数过多，请稍后重试",
    input_tpm_rate_limit_exceeded: "输入TPM配额超限：请控制请求频率",
    output_tpm_rate_limit_exceeded: "输出TPM配额超限：请控制请求频率",
    Offline_batch_reasoning_refused: "批推流量被拒绝：请稍后重试",
    preemptible_rate_limit_exceeded: "混抢资源QPS超限：请稍后重试",
    user_rate_limit_exceeded: "QPS配额超限：请控制请求频率",
    cluster_rate_limit_exceeded: "集群QPS超限：请稍后重试",
    cluster_rpm_rate_limit_exceeded: "集群RPM超限：请联系技术支持",
    cluster_tpm_rate_limit_exceeded: "集群TPM超限：请联系技术支持",

    // 500 错误
    internal_error: "系统内部错误：请稍后重试",
    dispatch_internal_error: "调度服务错误：请稍后重试",
    image_genration_interal_error: "文生图服务内部错误：请稍后重试",
};

/**
 * 错误排查建议映射表
 */
const ERROR_SUGGESTIONS: Record<string, string[]> = {
    characters_too_long: [
        "适当缩短输入内容",
        "将长文本拆分为多个请求",
        "考虑使用支持更长上下文的模型",
    ],
    tokens_too_long: [
        "适当缩短输入内容",
        "将长文本拆分为多个请求",
        "考虑使用支持更长上下文的模型",
    ],
    invalid_iam_token: [
        "检查API Key是否正确配置",
        "确认API Key格式为 'bce-v3/...'",
        "检查API Key是否已过期",
        "确认已在控制台创建V2版本的API Key",
        "访问：https://console.bce.baidu.com/qianfan/ais/console/onlineService",
    ],
    rpm_rate_limit_exceeded: [
        "适当控制请求频率，避免过于频繁",
        "如需更大配额，请在控制台购买RPM/TPM配额",
        "考虑实现请求队列和重试机制",
    ],
    tpm_rate_limit_exceeded: [
        "适当控制请求频率，避免过于频繁",
        "减少单次请求的token数量",
        "如需更大配额，请在控制台购买RPM/TPM配额",
    ],
    user_rate_limit_exceeded: [
        "适当控制请求频率",
        "实现请求限流机制",
        "如持续出现，请联系技术支持",
    ],
    internal_error: ["请稍后重试", "如持续出现，请联系百度云技术支持"],
};

/**
 * 解析百度千帆API错误并返回友好的错误消息
 * @param error - 错误对象（可能来自fetch、OpenAI SDK等）
 * @returns 格式化的错误消息
 */
export function parseQianfanError(error: any): string {
    // 处理各种可能的错误格式
    let errorResponse: QianfanErrorResponse = {};

    // 1. OpenAI SDK格式的错误
    if (error?.error) {
        errorResponse = {
            code: error.error.code,
            message: error.error.message,
            type: error.error.type,
            status: error.status,
        };
    }
    // 2. 直接的响应格式
    else if (error?.code || error?.message) {
        errorResponse = {
            code: error.code,
            message: error.message,
            type: error.type,
            status: error.status,
        };
    }
    // 3. HTTP响应错误
    else if (error?.response) {
        const data = error.response.data || error.response;
        errorResponse = {
            code: data.code || data.error_code,
            message: data.message || data.error_msg,
            type: data.type,
            status: error.response.status || error.status,
        };
    }

    const { code, message, type, status } = errorResponse;

    // 构建错误消息
    let errorMsg = "百度千帆API错误";

    // 添加HTTP状态码
    if (status) {
        errorMsg += ` (${status})`;
    }

    // 添加错误类型
    if (type) {
        errorMsg += ` [${type}]`;
    }

    errorMsg += ":\n";

    // 获取友好的错误消息
    if (code && ERROR_MESSAGES[code]) {
        errorMsg += `• ${ERROR_MESSAGES[code]}\n`;
    } else if (message) {
        errorMsg += `• ${message}\n`;
    } else if (code) {
        errorMsg += `• 错误码: ${code}\n`;
    } else {
        errorMsg += `• ${String(error)}\n`;
    }

    // 添加排查建议
    if (code && ERROR_SUGGESTIONS[code]) {
        errorMsg += "\n排查建议:\n";
        ERROR_SUGGESTIONS[code].forEach((suggestion, index) => {
            errorMsg += `  ${index + 1}. ${suggestion}\n`;
        });
    }

    // 如果是鉴权错误，添加额外的帮助信息
    if (
        status === 401 ||
        code === "invalid_iam_token" ||
        code === "invalid_appid"
    ) {
        errorMsg +=
            "\n💡 提示：百度千帆已迁移到V2版本API，请确保:\n";
        errorMsg += "  • 使用V2版本的API Key（而非旧版AK/SK）\n";
        errorMsg +=
            "  • API Key格式类似: bce-v3/ALTAK-***/***\n";
        errorMsg +=
            "  • 在控制台 -> 安全认证 -> API Key 中创建\n";
    }

    return errorMsg.trim();
}

/**
 * 判断错误是否为限流错误
 * @param error - 错误对象
 * @returns 是否为限流错误
 */
export function isRateLimitError(error: any): boolean {
    const code =
        error?.error?.code || error?.code || error?.response?.data?.code;
    return (
        code?.includes("rate_limit_exceeded") ||
        error?.status === 429 ||
        error?.response?.status === 429
    );
}

/**
 * 判断错误是否为鉴权错误
 * @param error - 错误对象
 * @returns 是否为鉴权错误
 */
export function isAuthError(error: any): boolean {
    const code =
        error?.error?.code || error?.code || error?.response?.data?.code;
    return (
        code === "invalid_iam_token" ||
        code === "invalid_appid" ||
        code === "no_parameter_permission" ||
        error?.status === 401 ||
        error?.response?.status === 401
    );
}
