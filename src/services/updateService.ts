import * as Updates from 'expo-updates';

/**
 * Over-the-air update handling.
 *
 * Updates only apply to builds with a matching runtimeVersion (tied to the
 * app version by the "appVersion" policy in app.json), so a JS bundle can
 * never land on a binary it was not built against.
 *
 * Disabled in development, where the bundle is served by Metro.
 */
export const updateService = {
  /**
   * Whether OTA updates are active for this build.
   */
  isEnabled(): boolean {
    return !__DEV__ && Updates.isEnabled;
  },

  /**
   * Check whether a newer bundle is published for this runtime version.
   */
  async isUpdateAvailable(): Promise<boolean> {
    if (!updateService.isEnabled()) return false;

    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      return isAvailable;
    } catch {
      // Offline or the updates server is unreachable - stay on the current bundle.
      return false;
    }
  },

  /**
   * Download a pending update. Returns true if a new bundle was stored, in
   * which case it takes effect on the next app start (or via restart()).
   */
  async downloadUpdate(): Promise<boolean> {
    if (!updateService.isEnabled()) return false;

    try {
      const { isNew } = await Updates.fetchUpdateAsync();
      return isNew;
    } catch {
      return false;
    }
  },

  /**
   * Restart into the downloaded bundle immediately.
   */
  async restart(): Promise<void> {
    await Updates.reloadAsync();
  },

  /**
   * Fetch any pending update in the background. The new bundle is applied on
   * the next launch rather than interrupting the current session.
   */
  async syncInBackground(): Promise<void> {
    if (!(await updateService.isUpdateAvailable())) return;
    await updateService.downloadUpdate();
  },
};
