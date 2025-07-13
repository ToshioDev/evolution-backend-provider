export class CreateBasicInstanceDto {
  userId: string;
  number?: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export class UpdateInstanceSettingsDto {
  alwaysOnline?: boolean;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export class ToggleAlwaysOnlineDto {
  enabled: boolean;
}

export class ToggleRejectCallDto {
  enabled: boolean;
  msgCall?: string;
}

export class ToggleGroupsIgnoreDto {
  enabled: boolean;
}

export class ToggleReadMessagesDto {
  enabled: boolean;
}

export class ToggleReadStatusDto {
  enabled: boolean;
}

export class ToggleSyncFullHistoryDto {
  enabled: boolean;
}

export class SetWebSocketConfigDto {
  enabled?: boolean;
  events?: string[];
}
