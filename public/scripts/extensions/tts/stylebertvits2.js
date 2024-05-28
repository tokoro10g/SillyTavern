import { doExtrasFetch, getApiUrl, modules } from "../../extensions.js";
import { saveTtsProviderSettings } from "./index.js";

export { StyleBertVits2TtsProvider };

class StyleBertVits2TtsProvider {
    //########//
    // Config //
    //########//

    settings;
    ready = false;
    voices = [];
    separator = " ";

    defaultSettings = {
        providerEndpoint: "http://localhost:5000",
        voiceMap: {},
    };

    get settingsHtml() {
        let html = `
        <label for="sbv2_tts_endpoint">Provider Endpoint:</label>
        <input id="sbv2_tts_endpoint" type="text" class="text_pole" maxlength="250" value="${this.defaultSettings.providerEndpoint}"/>
        <span>
        `;
        return html;
    }

    onSettingsChange() {
        // Used when provider settings are updated from UI
        this.settings.providerEndpoint = $("#sbv2_tts_endpoint").val();
        saveTtsProviderSettings();
    }

    async loadSettings(settings) {
        // Pupulate Provider UI given input settings
        if (Object.keys(settings).length == 0) {
            console.info("Using default TTS Provider settings");
        }

        // Only accept keys defined in defaultSettings
        this.settings = this.defaultSettings;

        for (const key in settings) {
            if (key in this.settings) {
                this.settings[key] = settings[key];
            } else {
                throw `Invalid setting passed to TTS Provider: ${key}`;
            }
        }

        const apiCheckInterval = setInterval(() => {
            // Use Extras API if TTS support is enabled
            if (modules.includes("tts")) {
                const baseUrl = new URL(getApiUrl());
                this.settings.providerEndpoint = baseUrl.toString();
                $("#sbv2_tts_endpoint").val(this.settings.providerEndpoint);
                clearInterval(apiCheckInterval);
            }
        }, 2000);

        $("#sbv2_tts_endpoint").val(this.settings.providerEndpoint);
        $("#sbv2_tts_endpoint").on("input", () => {
            this.onSettingsChange();
        });

        await this.checkReady();

        console.debug("StyleBertVits2 TTS: Settings loaded");
    }

    // Perform a simple readiness check by trying to fetch voiceIds
    async checkReady() {
        await this.fetchTtsVoiceObjects();
    }

    async onRefreshClick() {
        return;
    }

    //#################//
    //  TTS Interfaces //
    //#################//

    async getVoice(voiceName) {
        if (this.voices.length == 0) {
            this.voices = await this.fetchTtsVoiceObjects();
        }
        const match = this.voices.filter(
            (sbv2Voice) => sbv2Voice.name == voiceName
        )[0];
        if (!match) {
            throw `TTS Voice name ${voiceName} not found`;
        }
        return match;
    }

    async generateTts(text, voiceId) {
        const match = this.voices.find((voice) => voice.voice_id == voiceId);
        if (!match) {
            throw `TTS Voice ID ${voiceId} not found`;
        }
        // temporary fix for punctuations with expression symbols
        text = text.replaceAll(/[♡♪]/g, "・・・！");
        const response = await this.fetchTtsGeneration(
            text,
            match.model_id,
            match.speaker_id
        );
        return response;
    }

    //###########//
    // API CALLS //
    //###########//
    async fetchTtsVoiceObjects() {
        const response = await doExtrasFetch(
            `${this.settings.providerEndpoint}/models/info`
        );
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${await response.json()}`
            );
        }
        const responseJson = await response.json();
        return Object.entries(responseJson).flatMap(([modelId, model]) => {
            return Object.entries(model["id2spk"]).map(
                ([speakerId, voiceName]) => {
                    return {
                        name: voiceName,
                        voice_id: modelId + "/" + voiceName,
                        preview_url: false,
                        lang: "ja-JP", // TODO
                        model_id: parseInt(modelId),
                        speaker_id: speakerId,
                    };
                }
            );
        });
    }

    async fetchTtsGeneration(inputText, modelId, speakerId) {
        console.info(
            `Generating new TTS for model_id ${modelId}/speaker_id ${speakerId}`
        );
        const response = await doExtrasFetch(
            `${this.settings.providerEndpoint}/voice`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache", // Added this line to disable caching of file so new files are always played - Rolyat 7/7/23
                },
                body: JSON.stringify({
                    params: {
                        text: inputText,
                        model_id: modelId,
                        speaker_id: speakerId,
                    },
                }),
            }
        );
        if (!response.ok) {
            toastr.error(response.statusText, "TTS Generation Failed");
            throw new Error(
                `HTTP ${response.status}: ${await response.text()}`
            );
        }
        return response;
    }

    // Interface not used by StyleBertVits2 TTS
    async fetchTtsFromHistory(history_item_id) {
        return Promise.resolve(history_item_id);
    }
}
