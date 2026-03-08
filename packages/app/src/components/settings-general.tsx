import { Component, Show, createMemo, createResource, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Select } from "@opencode-ai/ui/select"
import { Switch } from "@opencode-ai/ui/switch"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useTheme, type ColorScheme } from "@opencode-ai/ui/theme"
import { showToast } from "@opencode-ai/ui/toast"
import { useLanguage } from "@/context/language"
import { usePlatform } from "@/context/platform"
import { useSettings, monoFontFamily } from "@/context/settings"
import { playSound, SOUND_OPTIONS } from "@/utils/sound"
import { createVoiceDevices } from "@/voice/devices"
import { createVoiceInput } from "@/voice/input"
import { testVoiceOutput } from "@/voice/tts"
import { Link } from "./link"

let demoSoundState = {
  cleanup: undefined as (() => void) | undefined,
  timeout: undefined as NodeJS.Timeout | undefined,
}

// To prevent audio from overlapping/playing very quickly when navigating the settings menus,
// delay the playback by 100ms during quick selection changes and pause existing sounds.
const stopDemoSound = () => {
  if (demoSoundState.cleanup) {
    demoSoundState.cleanup()
  }
  clearTimeout(demoSoundState.timeout)
  demoSoundState.cleanup = undefined
}

const playDemoSound = (src: string | undefined) => {
  stopDemoSound()
  if (!src) return

  demoSoundState.timeout = setTimeout(() => {
    demoSoundState.cleanup = playSound(src)
  }, 100)
}

export const SettingsGeneral: Component = () => {
  const theme = useTheme()
  const language = useLanguage()
  const platform = usePlatform()
  const settings = useSettings()

  const [store, setStore] = createStore({
    checking: false,
    voiceInputTesting: false,
    voiceOutputTesting: false,
  })
  const voice = createVoiceDevices()
  const input = createVoiceInput({ device: settings.voice.input })

  const linux = createMemo(() => platform.platform === "desktop" && platform.os === "linux")

  const check = () => {
    if (!platform.checkUpdate) return
    setStore("checking", true)

    void platform
      .checkUpdate()
      .then((result) => {
        if (!result.updateAvailable) {
          showToast({
            variant: "success",
            icon: "circle-check",
            title: language.t("settings.updates.toast.latest.title"),
            description: language.t("settings.updates.toast.latest.description", { version: platform.version ?? "" }),
          })
          return
        }

        const actions =
          platform.update && platform.restart
            ? [
                {
                  label: language.t("toast.update.action.installRestart"),
                  onClick: async () => {
                    await platform.update!()
                    await platform.restart!()
                  },
                },
                {
                  label: language.t("toast.update.action.notYet"),
                  onClick: "dismiss" as const,
                },
              ]
            : [
                {
                  label: language.t("toast.update.action.notYet"),
                  onClick: "dismiss" as const,
                },
              ]

        showToast({
          persistent: true,
          icon: "download",
          title: language.t("toast.update.title"),
          description: language.t("toast.update.description", { version: result.version ?? "" }),
          actions,
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("checking", false))
  }

  const themeOptions = createMemo(() =>
    Object.entries(theme.themes()).map(([id, def]) => ({ id, name: def.name ?? id })),
  )

  const colorSchemeOptions = createMemo((): { value: ColorScheme; label: string }[] => [
    { value: "system", label: language.t("theme.scheme.system") },
    { value: "light", label: language.t("theme.scheme.light") },
    { value: "dark", label: language.t("theme.scheme.dark") },
  ])

  const languageOptions = createMemo(() =>
    language.locales.map((locale) => ({
      value: locale,
      label: language.label(locale),
    })),
  )

  const fontOptions = [
    { value: "ibm-plex-mono", label: "font.option.ibmPlexMono" },
    { value: "cascadia-code", label: "font.option.cascadiaCode" },
    { value: "fira-code", label: "font.option.firaCode" },
    { value: "hack", label: "font.option.hack" },
    { value: "inconsolata", label: "font.option.inconsolata" },
    { value: "intel-one-mono", label: "font.option.intelOneMono" },
    { value: "iosevka", label: "font.option.iosevka" },
    { value: "jetbrains-mono", label: "font.option.jetbrainsMono" },
    { value: "meslo-lgs", label: "font.option.mesloLgs" },
    { value: "roboto-mono", label: "font.option.robotoMono" },
    { value: "source-code-pro", label: "font.option.sourceCodePro" },
    { value: "ubuntu-mono", label: "font.option.ubuntuMono" },
    { value: "geist-mono", label: "font.option.geistMono" },
  ] as const
  const fontOptionsList = [...fontOptions]

  const noneSound = { id: "none", label: "sound.option.none", src: undefined } as const
  const soundOptions = [noneSound, ...SOUND_OPTIONS]

  const soundSelectProps = (
    enabled: () => boolean,
    current: () => string,
    setEnabled: (value: boolean) => void,
    set: (id: string) => void,
  ) => ({
    options: soundOptions,
    current: enabled() ? (soundOptions.find((o) => o.id === current()) ?? noneSound) : noneSound,
    value: (o: (typeof soundOptions)[number]) => o.id,
    label: (o: (typeof soundOptions)[number]) => language.t(o.label),
    onHighlight: (option: (typeof soundOptions)[number] | undefined) => {
      if (!option) return
      playDemoSound(option.src)
    },
    onSelect: (option: (typeof soundOptions)[number] | undefined) => {
      if (!option) return
      if (option.id === "none") {
        setEnabled(false)
        stopDemoSound()
        return
      }
      setEnabled(true)
      set(option.id)
      playDemoSound(option.src)
    },
    variant: "secondary" as const,
    size: "small" as const,
    triggerVariant: "settings" as const,
  })

  const AppearanceSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.appearance")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.row.language.title")}
          description={language.t("settings.general.row.language.description")}
        >
          <Select
            data-action="settings-language"
            options={languageOptions()}
            current={languageOptions().find((o) => o.value === language.locale())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(option) => option && language.setLocale(option.value)}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.appearance.title")}
          description={language.t("settings.general.row.appearance.description")}
        >
          <Select
            data-action="settings-color-scheme"
            options={colorSchemeOptions()}
            current={colorSchemeOptions().find((o) => o.value === theme.colorScheme())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(option) => option && theme.setColorScheme(option.value)}
            onHighlight={(option) => {
              if (!option) return
              theme.previewColorScheme(option.value)
              return () => theme.cancelPreview()
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.theme.title")}
          description={
            <>
              {language.t("settings.general.row.theme.description")}{" "}
              <Link href="https://opencode.ai/docs/themes/">{language.t("common.learnMore")}</Link>
            </>
          }
        >
          <Select
            data-action="settings-theme"
            options={themeOptions()}
            current={themeOptions().find((o) => o.id === theme.themeId())}
            value={(o) => o.id}
            label={(o) => o.name}
            onSelect={(option) => {
              if (!option) return
              theme.setTheme(option.id)
            }}
            onHighlight={(option) => {
              if (!option) return
              theme.previewTheme(option.id)
              return () => theme.cancelPreview()
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.font.title")}
          description={language.t("settings.general.row.font.description")}
        >
          <Select
            data-action="settings-font"
            options={fontOptionsList}
            current={fontOptionsList.find((o) => o.value === settings.appearance.font())}
            value={(o) => o.value}
            label={(o) => language.t(o.label)}
            onSelect={(option) => option && settings.appearance.setFont(option.value)}
            variant="secondary"
            size="small"
            triggerVariant="settings"
            triggerStyle={{ "font-family": monoFontFamily(settings.appearance.font()), "min-width": "180px" }}
          >
            {(option) => (
              <span style={{ "font-family": monoFontFamily(option?.value) }}>
                {option ? language.t(option.label) : ""}
              </span>
            )}
          </Select>
        </SettingsRow>
      </div>
    </div>
  )

  const voiceOptions = (kind: "audioinput" | "audiooutput") => {
    const items = kind === "audioinput" ? voice.inputs() : voice.outputs()
    return [{ id: "default", label: language.t("settings.general.voice.device.default") }, ...items]
  }

  const testInput = async () => {
    setStore("voiceInputTesting", true)
    const peak = await input.test(2200)
    if (peak === undefined) {
      showToast({
        title: language.t("settings.general.voice.testInput.error.title"),
        description: language.t("settings.general.voice.testInput.error.description", { error: input.error() }),
        variant: "error",
      })
      setStore("voiceInputTesting", false)
      return
    }
    if (peak <= 0.02) {
      showToast({
        title: language.t("settings.general.voice.testInput.quiet.title"),
        description: language.t("settings.general.voice.testInput.quiet.description"),
        variant: "default",
      })
      setStore("voiceInputTesting", false)
      return
    }
    showToast({
      title: language.t("settings.general.voice.testInput.success.title"),
      description: language.t("settings.general.voice.testInput.success.description", { level: peak.toFixed(3) }),
      variant: "success",
    })
    setStore("voiceInputTesting", false)
  }

  const testOutput = () => {
    setStore("voiceOutputTesting", true)
    const ok = testVoiceOutput(language.t("settings.general.voice.testOutput.sample"))
    showToast({
      title: ok
        ? language.t("settings.general.voice.testOutput.success.title")
        : language.t("settings.general.voice.testOutput.error.title"),
      description: ok
        ? language.t("settings.general.voice.testOutput.success.description")
        : language.t("settings.general.voice.testOutput.error.description"),
      variant: ok ? "success" : "error",
    })
    setTimeout(() => setStore("voiceOutputTesting", false), 1000)
  }

  const FeedSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.feed")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.row.reasoningSummaries.title")}
          description={language.t("settings.general.row.reasoningSummaries.description")}
        >
          <div data-action="settings-feed-reasoning-summaries">
            <Switch
              checked={settings.general.showReasoningSummaries()}
              onChange={(checked) => settings.general.setShowReasoningSummaries(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.shellToolPartsExpanded.title")}
          description={language.t("settings.general.row.shellToolPartsExpanded.description")}
        >
          <div data-action="settings-feed-shell-tool-parts-expanded">
            <Switch
              checked={settings.general.shellToolPartsExpanded()}
              onChange={(checked) => settings.general.setShellToolPartsExpanded(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.editToolPartsExpanded.title")}
          description={language.t("settings.general.row.editToolPartsExpanded.description")}
        >
          <div data-action="settings-feed-edit-tool-parts-expanded">
            <Switch
              checked={settings.general.editToolPartsExpanded()}
              onChange={(checked) => settings.general.setEditToolPartsExpanded(checked)}
            />
          </div>
        </SettingsRow>
      </div>
    </div>
  )

  const NotificationsSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.notifications")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.notifications.agent.title")}
          description={language.t("settings.general.notifications.agent.description")}
        >
          <div data-action="settings-notifications-agent">
            <Switch
              checked={settings.notifications.agent()}
              onChange={(checked) => settings.notifications.setAgent(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.notifications.permissions.title")}
          description={language.t("settings.general.notifications.permissions.description")}
        >
          <div data-action="settings-notifications-permissions">
            <Switch
              checked={settings.notifications.permissions()}
              onChange={(checked) => settings.notifications.setPermissions(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.notifications.errors.title")}
          description={language.t("settings.general.notifications.errors.description")}
        >
          <div data-action="settings-notifications-errors">
            <Switch
              checked={settings.notifications.errors()}
              onChange={(checked) => settings.notifications.setErrors(checked)}
            />
          </div>
        </SettingsRow>
      </div>
    </div>
  )

  const SoundsSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.sounds")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.sounds.agent.title")}
          description={language.t("settings.general.sounds.agent.description")}
        >
          <Select
            data-action="settings-sounds-agent"
            {...soundSelectProps(
              () => settings.sounds.agentEnabled(),
              () => settings.sounds.agent(),
              (value) => settings.sounds.setAgentEnabled(value),
              (id) => settings.sounds.setAgent(id),
            )}
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.sounds.permissions.title")}
          description={language.t("settings.general.sounds.permissions.description")}
        >
          <Select
            data-action="settings-sounds-permissions"
            {...soundSelectProps(
              () => settings.sounds.permissionsEnabled(),
              () => settings.sounds.permissions(),
              (value) => settings.sounds.setPermissionsEnabled(value),
              (id) => settings.sounds.setPermissions(id),
            )}
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.sounds.errors.title")}
          description={language.t("settings.general.sounds.errors.description")}
        >
          <Select
            data-action="settings-sounds-errors"
            {...soundSelectProps(
              () => settings.sounds.errorsEnabled(),
              () => settings.sounds.errors(),
              (value) => settings.sounds.setErrorsEnabled(value),
              (id) => settings.sounds.setErrors(id),
            )}
          />
        </SettingsRow>
      </div>
    </div>
  )

  const VoiceSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.voice")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.voice.enabled.title")}
          description={language.t("settings.general.voice.enabled.description")}
        >
          <div data-action="settings-voice-enabled">
            <Switch checked={settings.voice.enabled()} onChange={(checked) => settings.voice.setEnabled(checked)} />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.voice.autoSend.title")}
          description={language.t("settings.general.voice.autoSend.description")}
        >
          <div data-action="settings-voice-auto-send">
            <Switch checked={settings.voice.autoSend()} onChange={(checked) => settings.voice.setAutoSend(checked)} />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.voice.autoSpeak.title")}
          description={language.t("settings.general.voice.autoSpeak.description")}
        >
          <div data-action="settings-voice-auto-speak">
            <Switch checked={settings.voice.autoSpeak()} onChange={(checked) => settings.voice.setAutoSpeak(checked)} />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.voice.autoStop.title")}
          description={language.t("settings.general.voice.autoStop.description")}
        >
          <div data-action="settings-voice-auto-stop">
            <Switch checked={settings.voice.autoStop()} onChange={(checked) => settings.voice.setAutoStop(checked)} />
          </div>
        </SettingsRow>

        <Show when={settings.voice.autoStop()}>
          <SettingsRow
            title={language.t("settings.general.voice.silence.title")}
            description={language.t("settings.general.voice.silence.description")}
          >
            <Select
              data-action="settings-voice-silence"
              options={[500, 1000, 1500, 2000, 2500].map((value) => ({ value, label: `${value}ms` }))}
              current={[500, 1000, 1500, 2000, 2500]
                .map((value) => ({ value, label: `${value}ms` }))
                .find((item) => item.value === settings.voice.silenceMs())}
              value={(item) => String(item.value)}
              label={(item) => item.label}
              onSelect={(item) => item && settings.voice.setSilenceMs(item.value)}
              variant="secondary"
              size="small"
              triggerVariant="settings"
            />
          </SettingsRow>
        </Show>

        <Show when={voice.supported()}>
          <SettingsRow
            title={language.t("settings.general.voice.input.title")}
            description={language.t("settings.general.voice.input.description")}
          >
            <div class="flex items-center gap-2">
              <Select
                data-action="settings-voice-input"
                options={voiceOptions("audioinput")}
                current={voiceOptions("audioinput").find((item) => item.id === settings.voice.input())}
                value={(item) => item.id}
                label={(item) => item.label}
                onSelect={(item) => item && settings.voice.setInput(item.id)}
                variant="secondary"
                size="small"
                triggerVariant="settings"
              />
              <Button size="small" variant="secondary" disabled={store.voiceInputTesting} onClick={() => void testInput()}>
                {store.voiceInputTesting
                  ? language.t("settings.general.voice.testInput.running")
                  : language.t("settings.general.voice.testInput.action")}
              </Button>
            </div>
          </SettingsRow>

          <Show when={store.voiceInputTesting || input.running()}>
            <SettingsRow
              title={language.t("settings.general.voice.testInput.level.title")}
              description={language.t("settings.general.voice.testInput.level.description")}
            >
              <div class="flex items-center gap-3 min-w-56">
                <div class="h-2 flex-1 rounded-full bg-surface border border-border overflow-hidden">
                  <div
                    class="h-full bg-success transition-all duration-75"
                    style={{ width: `${Math.max(2, Math.min(100, input.level() * 220))}%` }}
                  />
                </div>
                <span class="w-12 text-right text-12-regular text-text-weak">{input.level().toFixed(3)}</span>
              </div>
            </SettingsRow>
          </Show>

          <SettingsRow
            title={language.t("settings.general.voice.output.title")}
            description={language.t("settings.general.voice.output.description")}
          >
            <div class="flex items-center gap-2">
              <Select
                data-action="settings-voice-output"
                options={voiceOptions("audiooutput")}
                current={voiceOptions("audiooutput").find((item) => item.id === settings.voice.output())}
                value={(item) => item.id}
                label={(item) => item.label}
                onSelect={(item) => item && settings.voice.setOutput(item.id)}
                variant="secondary"
                size="small"
                triggerVariant="settings"
              />
              <Button size="small" variant="secondary" disabled={store.voiceOutputTesting} onClick={testOutput}>
                {store.voiceOutputTesting
                  ? language.t("settings.general.voice.testOutput.running")
                  : language.t("settings.general.voice.testOutput.action")}
              </Button>
            </div>
          </SettingsRow>
        </Show>
      </div>
    </div>
  )

  const UpdatesSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.updates")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.updates.row.startup.title")}
          description={language.t("settings.updates.row.startup.description")}
        >
          <div data-action="settings-updates-startup">
            <Switch
              checked={settings.updates.startup()}
              disabled={!platform.checkUpdate}
              onChange={(checked) => settings.updates.setStartup(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.releaseNotes.title")}
          description={language.t("settings.general.row.releaseNotes.description")}
        >
          <div data-action="settings-release-notes">
            <Switch
              checked={settings.general.releaseNotes()}
              onChange={(checked) => settings.general.setReleaseNotes(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.updates.row.check.title")}
          description={language.t("settings.updates.row.check.description")}
        >
          <Button size="small" variant="secondary" disabled={store.checking || !platform.checkUpdate} onClick={check}>
            {store.checking
              ? language.t("settings.updates.action.checking")
              : language.t("settings.updates.action.checkNow")}
          </Button>
        </SettingsRow>
      </div>
    </div>
  )

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-1 pt-6 pb-8">
          <h2 class="text-16-medium text-text-strong">{language.t("settings.tab.general")}</h2>
        </div>
      </div>

      <div class="flex flex-col gap-8 w-full">
        <AppearanceSection />

        <FeedSection />

        <NotificationsSection />

        <SoundsSection />

        <VoiceSection />

        {/*<Show when={platform.platform === "desktop" && platform.os === "windows" && platform.getWslEnabled}>
          {(_) => {
            const [enabledResource, actions] = createResource(() => platform.getWslEnabled?.())
            const enabled = () => (enabledResource.state === "pending" ? undefined : enabledResource.latest)

            return (
              <div class="flex flex-col gap-1">
                <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.desktop.section.wsl")}</h3>

                <div class="bg-surface-raised-base px-4 rounded-lg">
                  <SettingsRow
                    title={language.t("settings.desktop.wsl.title")}
                    description={language.t("settings.desktop.wsl.description")}
                  >
                    <div data-action="settings-wsl">
                      <Switch
                        checked={enabled() ?? false}
                        disabled={enabledResource.state === "pending"}
                        onChange={(checked) => platform.setWslEnabled?.(checked)?.finally(() => actions.refetch())}
                      />
                    </div>
                  </SettingsRow>
                </div>
              </div>
            )
          }}
        </Show>*/}

        <UpdatesSection />

        <Show when={linux()}>
          {(_) => {
            const [valueResource, actions] = createResource(() => platform.getDisplayBackend?.())
            const value = () => (valueResource.state === "pending" ? undefined : valueResource.latest)

            const onChange = (checked: boolean) =>
              platform.setDisplayBackend?.(checked ? "wayland" : "auto").finally(() => actions.refetch())

            return (
              <div class="flex flex-col gap-1">
                <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.display")}</h3>

                <div class="bg-surface-raised-base px-4 rounded-lg">
                  <SettingsRow
                    title={
                      <div class="flex items-center gap-2">
                        <span>{language.t("settings.general.row.wayland.title")}</span>
                        <Tooltip value={language.t("settings.general.row.wayland.tooltip")} placement="top">
                          <span class="text-text-weak">
                            <Icon name="help" size="small" />
                          </span>
                        </Tooltip>
                      </div>
                    }
                    description={language.t("settings.general.row.wayland.description")}
                  >
                    <div data-action="settings-wayland">
                      <Switch checked={value() === "wayland"} onChange={onChange} />
                    </div>
                  </SettingsRow>
                </div>
              </div>
            )
          }}
        </Show>
      </div>
    </div>
  )
}

interface SettingsRowProps {
  title: string | JSX.Element
  description: string | JSX.Element
  children: JSX.Element
}

const SettingsRow: Component<SettingsRowProps> = (props) => {
  return (
    <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base last:border-none">
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="text-14-medium text-text-strong">{props.title}</span>
        <span class="text-12-regular text-text-weak">{props.description}</span>
      </div>
      <div class="flex-shrink-0">{props.children}</div>
    </div>
  )
}
