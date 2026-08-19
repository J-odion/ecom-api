export interface DeviceActionResponse {
  success: boolean;
  message?: string;
  details?: any;
}

export interface RemoteDevice {
  fleetHostId: string;
  serialNumber: string;
  uuid?: string;
  name?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  os?: string;
  osVersion?: string;
  lastSeenAt?: Date;
  status: string; // the remote provider's status
}

export const DEVICE_PROVIDER = 'DEVICE_PROVIDER';

export interface DeviceProvider {
  /**
   * Fetch a single device by its internal provider ID
   */
  getDevice(providerId: string): Promise<RemoteDevice | null>;

  /**
   * List all devices managed by the provider
   */
  listDevices(): Promise<RemoteDevice[]>;

  /**
   * Action methods
   */
  lockDevice(providerId: string): Promise<DeviceActionResponse>;
  unlockDevice(providerId: string): Promise<DeviceActionResponse>;
  restartDevice(providerId: string): Promise<DeviceActionResponse>;
  shutdownDevice(providerId: string): Promise<DeviceActionResponse>;
  wipeDevice(providerId: string): Promise<DeviceActionResponse>;
  
  getDeviceLocation(providerId: string): Promise<any>;
  getDeviceStatus(providerId: string): Promise<any>;
  onboardDevice(providerId: string, userEmail: string): Promise<DeviceActionResponse>;
}
