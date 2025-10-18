import { Protocol, ProtocolOptions, RequestOptions } from '../shared/protocol.js';
import { Transport } from '../shared/transport.js';
import { CallToolRequest, CallToolResultSchema, CallToolResult, ClientCapabilities, ClientNotification, ClientRequest, ClientResult, CompatibilityCallToolResultSchema, CompleteRequest, GetPromptRequest, Implementation, ListPromptsRequest, ListResourcesRequest, ListResourceTemplatesRequest, ListToolsRequest, LoggingLevel, Notification, ReadResourceRequest, Request, Result, ServerCapabilities, SubscribeRequest, UnsubscribeRequest, CompleteResult, GetPromptResult, ListPromptsResult, ListResourcesResult } from '../types.js';
import { EmptyResult, ListResourceTemplatesResult, ReadResourceResult, ListToolsResult } from '../types.js';
export type ClientOptions = ProtocolOptions & {
    /**
     * Capabilities to advertise as being supported by this client.
     */
    capabilities?: ClientCapabilities;
};
/**
 * An MCP client on top of a pluggable transport.
 *
 * The client will automatically begin the initialization flow with the server when connect() is called.
 *
 * To use with custom types, extend the base Request/Notification/Result types and pass them as type parameters:
 *
 * ```typescript
 * // Custom schemas
 * const CustomRequestSchema = RequestSchema.extend({...})
 * const CustomNotificationSchema = NotificationSchema.extend({...})
 * const CustomResultSchema = ResultSchema.extend({...})
 *
 * // Type aliases
 * type CustomRequest = z.infer<typeof CustomRequestSchema>
 * type CustomNotification = z.infer<typeof CustomNotificationSchema>
 * type CustomResult = z.infer<typeof CustomResultSchema>
 *
 * // Create typed client
 * const client = new Client<CustomRequest, CustomNotification, CustomResult>({
 *   name: "CustomClient",
 *   version: "1.0.0"
 * })
 * ```
 */
export declare class Client<RequestT extends Request = Request, NotificationT extends Notification = Notification, ResultT extends Result = Result> extends Protocol<ClientRequest | RequestT, ClientNotification | NotificationT, ClientResult | ResultT> {
    private _clientInfo;
    private _serverCapabilities?;
    private _serverVersion?;
    private _capabilities;
    private _instructions?;
    private _cachedToolOutputValidators;
    private _ajv;
    /**
     * Initializes this client with the given name and version information.
     */
    constructor(_clientInfo: Implementation, options?: ClientOptions);
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities: ClientCapabilities): void;
    protected assertCapability(capability: keyof ServerCapabilities, method: string): void;
    connect(transport: Transport, options?: RequestOptions): Promise<void>;
    /**
     * After initialization has completed, this will be populated with the server's reported capabilities.
     */
    getServerCapabilities(): ServerCapabilities | undefined;
    /**
     * After initialization has completed, this will be populated with information about the server's name and version.
     */
    getServerVersion(): Implementation | undefined;
    /**
     * After initialization has completed, this may be populated with information about the server's instructions.
     */
    getInstructions(): string | undefined;
    protected assertCapabilityForMethod(method: RequestT['method']): void;
    protected assertNotificationCapability(method: NotificationT['method']): void;
    protected assertRequestHandlerCapability(method: string): void;
    ping(options?: RequestOptions): Promise<EmptyResult>;
    complete(params: CompleteRequest['params'], options?: RequestOptions): Promise<CompleteResult>;
    setLoggingLevel(level: LoggingLevel, options?: RequestOptions): Promise<EmptyResult>;
    getPrompt(params: GetPromptRequest['params'], options?: RequestOptions): Promise<GetPromptResult>;
    listPrompts(params?: ListPromptsRequest['params'], options?: RequestOptions): Promise<ListPromptsResult>;
    listResources(params?: ListResourcesRequest['params'], options?: RequestOptions): Promise<ListResourcesResult>;
    listResourceTemplates(params?: ListResourceTemplatesRequest['params'], options?: RequestOptions): Promise<ListResourceTemplatesResult>;
    readResource(params: ReadResourceRequest['params'], options?: RequestOptions): Promise<ReadResourceResult>;
    subscribeResource(params: SubscribeRequest['params'], options?: RequestOptions): Promise<EmptyResult>;
    unsubscribeResource(params: UnsubscribeRequest['params'], options?: RequestOptions): Promise<EmptyResult>;
    callTool(params: CallToolRequest['params'], resultSchema?: typeof CallToolResultSchema | typeof CompatibilityCallToolResultSchema, options?: RequestOptions): Promise<CallToolResult>;
    private cacheToolOutputSchemas;
    private getToolOutputValidator;
    listTools(params?: ListToolsRequest['params'], options?: RequestOptions): Promise<ListToolsResult>;
    sendRootsListChanged(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map