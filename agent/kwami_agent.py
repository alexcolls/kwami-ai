"""
Kwami Agent - LiveKit Python Agent Template

This agent receives configuration from the kwami-ai frontend library and
dynamically configures itself based on the Kwami instance settings.

Each Kwami instance creates a unique agent with its own:
- Persona (personality, traits, system prompt)
- Voice pipeline (STT, LLM, TTS configuration)
- Tools and skills

Configuration updates can be sent in real-time without reconnecting.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    function_tool,
    RunContext,
    room_io,
)
from livekit.agents.llm import ChatContext
from livekit.plugins import openai, deepgram, cartesia, silero

logger = logging.getLogger("kwami-agent")
logger.setLevel(logging.INFO)


# =============================================================================
# KWAMI CONFIGURATION TYPES
# =============================================================================

@dataclass
class KwamiPersonaConfig:
    """Persona configuration from the Kwami frontend."""
    name: str = "Kwami"
    personality: str = "A friendly and helpful AI companion"
    system_prompt: str = ""
    traits: list[str] = field(default_factory=list)
    language: str = "en"
    conversation_style: str = "friendly"
    response_length: str = "medium"  # short, medium, long
    emotional_tone: str = "warm"  # neutral, warm, enthusiastic, calm


@dataclass
class KwamiVoiceConfig:
    """Voice pipeline configuration from the Kwami frontend."""
    # STT
    stt_provider: str = "deepgram"
    stt_model: str = "nova-2"
    stt_language: str = "en"
    
    # LLM
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o"
    llm_temperature: float = 0.8
    
    # TTS
    tts_provider: str = "cartesia"
    tts_voice: str = "79a125e8-cd45-4c13-8a67-188112f4dd22"  # Default voice
    tts_model: str = "sonic"
    tts_speed: float = 1.0
    
    # VAD
    vad_provider: str = "silero"
    vad_threshold: float = 0.5
    vad_min_speech_duration: float = 0.1
    vad_min_silence_duration: float = 0.3
    
    # Enhancements
    noise_cancellation: bool = True
    turn_detection: str = "server_vad"
    
    # Pipeline type
    pipeline_type: str = "voice"  # voice, realtime


@dataclass
class KwamiConfig:
    """Full Kwami configuration received from frontend."""
    kwami_id: str = ""
    kwami_name: str = "Kwami"
    persona: KwamiPersonaConfig = field(default_factory=KwamiPersonaConfig)
    voice: KwamiVoiceConfig = field(default_factory=KwamiVoiceConfig)
    tools: list[dict] = field(default_factory=list)


# =============================================================================
# KWAMI AGENT IMPLEMENTATION
# =============================================================================

class KwamiAgent(Agent):
    """
    Dynamic AI agent configured by the Kwami frontend library.
    
    Receives configuration via data channel and updates in real-time.
    """
    
    def __init__(self, config: Optional[KwamiConfig] = None):
        self.kwami_config = config or KwamiConfig()
        self._tasks: list[asyncio.Task] = []
        
        # Build system prompt from persona
        instructions = self._build_system_prompt()
        
        super().__init__(instructions=instructions)
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt from persona configuration."""
        persona = self.kwami_config.persona
        
        prompt_parts = []
        
        # Base system prompt
        if persona.system_prompt:
            prompt_parts.append(persona.system_prompt)
        else:
            prompt_parts.append(f"You are {persona.name}, {persona.personality}.")
        
        # Add traits
        if persona.traits:
            prompt_parts.append(f"\nKey traits: {', '.join(persona.traits)}")
        
        # Add conversation style
        if persona.conversation_style:
            prompt_parts.append(f"\nConversation style: {persona.conversation_style}")
        
        # Add response length guidance
        length_guide = {
            "short": "Keep responses brief and concise (1-2 sentences).",
            "medium": "Provide balanced responses with enough detail (2-4 sentences).",
            "long": "Give comprehensive, detailed responses when appropriate.",
        }
        if persona.response_length in length_guide:
            prompt_parts.append(f"\n{length_guide[persona.response_length]}")
        
        # Add emotional tone guidance
        tone_guide = {
            "neutral": "Maintain a balanced, objective tone.",
            "warm": "Express warmth and friendliness in your interactions.",
            "enthusiastic": "Show enthusiasm and energy in your responses.",
            "calm": "Maintain a calm, soothing demeanor.",
        }
        if persona.emotional_tone in tone_guide:
            prompt_parts.append(f"\n{tone_guide[persona.emotional_tone]}")
        
        return "\n".join(prompt_parts)
    
    async def on_enter(self):
        """Called when the agent joins the room."""
        room = self.session.room
        
        # Register handler for config updates from frontend
        room.on("data_received", self._handle_data_message)
        
        logger.info(f"🤖 Kwami agent '{self.kwami_config.kwami_name}' ({self.kwami_config.kwami_id}) entered room")
    
    async def _handle_data_message(
        self,
        data: bytes,
        participant: rtc.RemoteParticipant,
        kind: rtc.DataPacketKind,
        topic: Optional[str],
    ):
        """Handle incoming data messages from the frontend."""
        try:
            message = json.loads(data.decode("utf-8"))
            msg_type = message.get("type")
            
            if msg_type == "config":
                # Initial full configuration
                await self._apply_full_config(message)
            
            elif msg_type == "config_update":
                # Partial configuration update
                update_type = message.get("updateType")
                config = message.get("config")
                
                if update_type == "persona":
                    await self._update_persona(config)
                elif update_type == "voice":
                    await self._update_voice(config)
                elif update_type == "tools":
                    await self._update_tools(config)
                elif update_type == "full":
                    await self._apply_full_config(config)
            
            elif msg_type == "interrupt":
                # Handle interrupt signal
                await self._handle_interrupt()
            
        except json.JSONDecodeError:
            logger.warning("Received invalid JSON data message")
        except Exception as e:
            logger.error(f"Error handling data message: {e}")
    
    async def _apply_full_config(self, config: dict):
        """Apply full Kwami configuration."""
        logger.info(f"Applying full config for Kwami: {config.get('kwamiId', 'unknown')}")
        
        # Update Kwami ID and name
        self.kwami_config.kwami_id = config.get("kwamiId", "")
        self.kwami_config.kwami_name = config.get("kwamiName", "Kwami")
        
        # Update persona
        if "persona" in config:
            await self._update_persona(config["persona"])
        
        # Update voice config
        if "voice" in config:
            await self._update_voice(config["voice"])
        
        # Update tools
        if "tools" in config:
            await self._update_tools(config["tools"])
        
        logger.info(f"✅ Config applied for Kwami '{self.kwami_config.kwami_name}'")
    
    async def _update_persona(self, persona_config: dict):
        """Update persona configuration dynamically."""
        persona = self.kwami_config.persona
        
        # Update persona fields
        if "name" in persona_config:
            persona.name = persona_config["name"]
        if "personality" in persona_config:
            persona.personality = persona_config["personality"]
        if "systemPrompt" in persona_config:
            persona.system_prompt = persona_config["systemPrompt"]
        if "traits" in persona_config:
            persona.traits = persona_config["traits"]
        if "language" in persona_config:
            persona.language = persona_config["language"]
        if "conversationStyle" in persona_config:
            persona.conversation_style = persona_config["conversationStyle"]
        if "responseLength" in persona_config:
            persona.response_length = persona_config["responseLength"]
        if "emotionalTone" in persona_config:
            persona.emotional_tone = persona_config["emotionalTone"]
        
        # Rebuild and update instructions
        new_instructions = self._build_system_prompt()
        await self.update_instructions(new_instructions)
        
        logger.info(f"📝 Updated persona for '{persona.name}'")
    
    async def _update_voice(self, voice_config: dict):
        """Update voice pipeline configuration dynamically."""
        voice = self.kwami_config.voice
        
        # Update STT config
        if "stt" in voice_config:
            stt = voice_config["stt"]
            if "provider" in stt:
                voice.stt_provider = stt["provider"]
            if "model" in stt:
                voice.stt_model = stt["model"]
            if "language" in stt:
                voice.stt_language = stt["language"]
        
        # Update LLM config
        if "llm" in voice_config:
            llm_cfg = voice_config["llm"]
            if "provider" in llm_cfg:
                voice.llm_provider = llm_cfg["provider"]
            if "model" in llm_cfg:
                voice.llm_model = llm_cfg["model"]
            if "temperature" in llm_cfg:
                voice.llm_temperature = llm_cfg["temperature"]
        
        # Update TTS config
        if "tts" in voice_config:
            tts = voice_config["tts"]
            if "provider" in tts:
                voice.tts_provider = tts["provider"]
            if "voice" in tts:
                voice.tts_voice = tts["voice"]
            if "model" in tts:
                voice.tts_model = tts["model"]
            if "speed" in tts:
                voice.tts_speed = tts["speed"]
        
        # Update VAD config
        if "vad" in voice_config:
            vad = voice_config["vad"]
            if "provider" in vad:
                voice.vad_provider = vad["provider"]
            if "threshold" in vad:
                voice.vad_threshold = vad["threshold"]
        
        # Update enhancements
        if "enhancements" in voice_config:
            enh = voice_config["enhancements"]
            if "noiseCancellation" in enh:
                voice.noise_cancellation = enh["noiseCancellation"]["enabled"]
            if "turnDetection" in enh:
                voice.turn_detection = enh["turnDetection"]["mode"]
        
        # Note: Some voice changes may require session restart
        # For now, log the changes
        logger.info(f"🎙️ Updated voice config: LLM={voice.llm_model}, TTS={voice.tts_voice}")
    
    async def _update_tools(self, tools_config: list):
        """Update tools configuration dynamically."""
        self.kwami_config.tools = tools_config
        
        # Convert tool definitions to function tools
        # This is a simplified version - in production, you'd want to
        # actually create callable tools from the definitions
        
        logger.info(f"🔧 Updated tools: {len(tools_config)} tools registered")
    
    async def _handle_interrupt(self):
        """Handle interrupt signal from frontend."""
        logger.info("⚡ Interrupt received from frontend")
        # The agent framework handles interruption automatically
        # This is for any custom cleanup if needed
    
    # -------------------------------------------------------------------------
    # BUILT-IN TOOLS
    # -------------------------------------------------------------------------
    
    @function_tool()
    async def get_kwami_info(self, context: RunContext) -> dict[str, Any]:
        """Get information about this Kwami instance.
        
        Returns:
            Information about the current Kwami agent
        """
        return {
            "kwami_id": self.kwami_config.kwami_id,
            "kwami_name": self.kwami_config.kwami_name,
            "persona": {
                "name": self.kwami_config.persona.name,
                "personality": self.kwami_config.persona.personality,
            },
        }


# =============================================================================
# AGENT FACTORY
# =============================================================================

def create_stt(config: KwamiVoiceConfig):
    """Create STT instance based on configuration."""
    if config.stt_provider == "deepgram":
        return deepgram.STT(
            model=config.stt_model,
            language=config.stt_language,
        )
    # Add other providers as needed
    return deepgram.STT()


def create_llm(config: KwamiVoiceConfig):
    """Create LLM instance based on configuration."""
    if config.llm_provider == "openai":
        return openai.LLM(
            model=config.llm_model,
            temperature=config.llm_temperature,
        )
    # Add other providers as needed
    return openai.LLM()


def create_tts(config: KwamiVoiceConfig):
    """Create TTS instance based on configuration."""
    if config.tts_provider == "cartesia":
        return cartesia.TTS(
            voice=config.tts_voice,
            model=config.tts_model,
            speed=config.tts_speed,
        )
    elif config.tts_provider == "openai":
        return openai.TTS(
            voice=config.tts_voice,
        )
    # Add other providers as needed
    return cartesia.TTS()


def create_vad(config: KwamiVoiceConfig):
    """Create VAD instance based on configuration."""
    return silero.VAD.load(
        min_speech_duration=config.vad_min_speech_duration,
        min_silence_duration=config.vad_min_silence_duration,
    )


# =============================================================================
# AGENT SERVER
# =============================================================================

server = AgentServer()


@server.rtc_session()
async def kwami_session(ctx: JobContext):
    """
    Main entry point for Kwami agent sessions.
    
    Each Kwami instance from the frontend creates a new session with
    its own configuration.
    """
    logger.info(f"🚀 Kwami session starting in room: {ctx.room.name}")
    
    # Default configuration - will be updated when frontend sends config
    config = KwamiConfig()
    
    # Create the agent
    agent = KwamiAgent(config)
    
    # Create the session with voice pipeline components
    session = AgentSession(
        stt=create_stt(config.voice),
        llm=create_llm(config.voice),
        tts=create_tts(config.voice),
        vad=create_vad(config.voice),
    )
    
    # Start the session
    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=True,
            audio_output=True,
            noise_cancellation=room_io.NoiseFilter.BVC if config.voice.noise_cancellation else None,
        ),
    )
    
    logger.info(f"✅ Kwami session started for room: {ctx.room.name}")


if __name__ == "__main__":
    server.run()
