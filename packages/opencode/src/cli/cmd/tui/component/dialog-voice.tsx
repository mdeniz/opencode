import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useKV } from "@tui/context/kv"
import { listDevices } from "../voice"

export function DialogVoice() {
  const dialog = useDialog()
  const kv = useKV()
  const [input, setInput] = kv.signal("voice_input_device", "default")
  const [output, setOutput] = kv.signal("voice_output_device", "default")
  const list = listDevices()
  return (
    <DialogSelect
      title="Voice devices"
      options={[
        {
          title: `Input: ${input()}`,
          value: "input",
          description: "Select microphone source",
          onSelect: () => {
            dialog.replace(() => (
              <DialogSelect
                title="Voice input"
                current={input()}
                options={list.inputs.map((x) => ({
                  title: x.title,
                  value: x.id,
                  onSelect: () => {
                    setInput(() => x.id)
                    dialog.clear()
                  },
                }))}
              />
            ))
          },
        },
        {
          title: `Output: ${output()}`,
          value: "output",
          description: "Select speaker sink",
          onSelect: () => {
            dialog.replace(() => (
              <DialogSelect
                title="Voice output"
                current={output()}
                options={list.outputs.map((x) => ({
                  title: x.title,
                  value: x.id,
                  onSelect: () => {
                    setOutput(() => x.id)
                    dialog.clear()
                  },
                }))}
              />
            ))
          },
        },
      ]}
    />
  )
}
