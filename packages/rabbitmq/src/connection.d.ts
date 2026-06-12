import { ChannelModel, Channel } from "amqplib";
export declare function getConnection(): Promise<ChannelModel>;
export declare function getChannel(): Promise<Channel>;
export declare function disconnect(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map