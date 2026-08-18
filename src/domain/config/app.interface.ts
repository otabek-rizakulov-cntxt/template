export interface AppConfig {
  getNodeEnv(): string;
  getAppHost(): string;
  getAppPort(): number;
  getCorsAllowedOrigins(): string[];
}
