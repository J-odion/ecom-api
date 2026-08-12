import { Injectable, Logger } from '@nestjs/common';
import { DeviceProvider, DeviceActionResponse, RemoteDevice } from '../device-provider.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FleetProvider implements DeviceProvider {
  private readonly logger = new Logger(FleetProvider.name);
  private fleetUrl: string;
  private apiToken: string;

  constructor(private configService: ConfigService) {
    this.fleetUrl = this.configService.get<string>('FLEET_URL') || 'http://localhost:8080';
    this.apiToken = this.configService.get<string>('FLEET_API_TOKEN') || '';
  }

  // Helper method for API calls to Fleet
  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    if (!this.apiToken) {
      this.logger.warn('FLEET_API_TOKEN not configured. Returning mock data.');
      return null;
    }

    try {
      const response = await fetch(`${this.fleetUrl}/api/v1/fleet/${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Fleet API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed Fleet API request to ${endpoint}: ${error.message}`);
      throw error;
    }
  }

  async getDevice(providerId: string): Promise<RemoteDevice | null> {
    const data = await this.makeRequest(`hosts/${providerId}`);
    if (!data) return this.mockDevice(providerId);

    return this.mapHostToDevice(data.host);
  }

  async listDevices(): Promise<RemoteDevice[]> {
    const data = await this.makeRequest('hosts');
    if (!data) return [this.mockDevice('mock-1'), this.mockDevice('mock-2')];

    return (data.hosts || []).map((host: any) => this.mapHostToDevice(host));
  }

  async lockDevice(providerId: string): Promise<DeviceActionResponse> {
    const data = await this.makeRequest(`hosts/${providerId}/lock`, 'POST');
    if (!this.apiToken) {
      return { success: true, message: 'Mock lock successful' };
    }
    return { success: true, details: data };
  }

  async unlockDevice(providerId: string): Promise<DeviceActionResponse> {
    const data = await this.makeRequest(`hosts/${providerId}/unlock`, 'POST');
    if (!this.apiToken) {
      return { success: true, message: 'Mock unlock successful' };
    }
    return { success: true, details: data };
  }

  async restartDevice(providerId: string): Promise<DeviceActionResponse> {
    // Fleet uses MDM commands for restart if configured
    return { success: false, message: 'Not implemented in Fleet yet' };
  }

  async shutdownDevice(providerId: string): Promise<DeviceActionResponse> {
    return { success: false, message: 'Not implemented in Fleet yet' };
  }

  async wipeDevice(providerId: string): Promise<DeviceActionResponse> {
    const data = await this.makeRequest(`hosts/${providerId}/wipe`, 'POST');
    if (!this.apiToken) {
      return { success: true, message: 'Mock wipe successful' };
    }
    return { success: true, details: data };
  }

  async getDeviceLocation(providerId: string): Promise<any> {
    return { latitude: 0, longitude: 0 };
  }

  async getDeviceStatus(providerId: string): Promise<any> {
    return { status: 'ONLINE' };
  }

  private mapHostToDevice(host: any): RemoteDevice {
    return {
      fleetHostId: host.id.toString(),
      serialNumber: host.hardware_serial,
      uuid: host.uuid,
      name: host.display_name || host.hostname,
      type: host.platform === 'darwin' ? 'Mac' : host.platform,
      manufacturer: host.hardware_vendor,
      model: host.hardware_model,
      os: host.os_version,
      osVersion: host.os_version,
      lastSeenAt: host.seen_time ? new Date(host.seen_time) : undefined,
      status: host.status,
    };
  }

  private mockDevice(id: string): RemoteDevice {
    return {
      fleetHostId: id,
      serialNumber: `C02${id}Mock`,
      name: `Mock MacBook Pro (${id})`,
      type: 'Mac',
      os: 'macOS 14.0',
      status: 'online',
    };
  }
}
