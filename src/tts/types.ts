export interface SynthesizeOptions {
  /** Voice id, provider-specific (e.g. Edge: "en-US-AvaNeural"). */
  voice?: string
  /** Abort an in-flight request. */
  signal?: AbortSignal
}

export interface TtsResult {
  /** Object URL of the audio (mp3). Caller must revoke when done. */
  url: string
  /** Underlying blob, in case caller needs raw bytes. */
  blob: Blob
}

export interface TtsProvider {
  readonly name: string
  synthesize(text: string, opts?: SynthesizeOptions): Promise<TtsResult>
}
