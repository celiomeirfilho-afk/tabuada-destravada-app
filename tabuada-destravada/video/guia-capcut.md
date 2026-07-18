# GUIA DE EDIÇÃO — CapCut

Passo a passo para montar o vídeo final no CapCut (grátis: mobile + desktop).

---

## PREPARAÇÃO

### Arquivos necessários

| Arquivo | Onde gerar | Nome |
|---------|-----------|------|
| 🎬 40 clips de vídeo | Google Veo 3 | `cena-01.mp4` a `cena-40.mp4` |
| 🎙️ 9 áudios de narração | ElevenLabs | `audio-01-hook.mp3` a `audio-09-cta.mp3` |
| 🎵 4 faixas音乐 | Suno / Udio / Pixabay | `musica-01` a `musica-04` |
| 🖼️ Logo (PNG transparente) | Já temos | `LOGO_TABUADA.png` |

---

## PASSO 1 — Criar Projeto

1. Abra o **CapCut Desktop** (ou mobile)
2. Clique **"Novo projeto"**
3. Defina resolução: **1080 x 1920** (vertical) ou **1920 x 1080** (horizontal)
   - **Recomendado:** 1920x1080 (horizontal) para YouTube/Kiwify
4. Frame rate: **30 FPS**

---

## PASSO 2 — Importar Arquivos

1. Clique **"Importar"**
2. Selecione todos os 40 clips (`cena-01.mp4` a `cena-40.mp4`)
3. Importe os 9 áudios de narração
4. Importe as 4 faixas音乐
5. Importe o logo

---

## PASSO 3 — Montar Timeline (Clips de Vídeo)

Arraste os clips para a timeline na seguinte ordem:

### Linha do tempo visual

```
0:00 ─── 0:20 ─── 0:50 ─── 1:25 ─── 1:55 ─── 2:15 ─── 2:35 ─── 2:55 ─── 3:30
  │        │        │        │        │        │        │        │        │
  HOOK   PROBLEMA  SOLUÇÃO  MÓDULOS  JOGOS   MÉTODO  TRANSFORM.  CTA
  │        │        │        │        │        │        │        │
  Cenas   Cenas    Cenas    Cenas    Cenas   Cenas   Cenas    Cenas
  1-8     1-8      9-14     11-14    15-17   18-19   25-30    31-40
```

### Ordem exata dos clips na timeline

```
[01] [02] [03] [04] [05] [06] [07] [08]  ← Hook + Problema (0:00-0:50)
[09] [10] [11] [12] [13] [14]              ← Solução (0:50-1:25)
[15] [16] [17]                              ← Jogos (1:25-1:55)
[18] [19] [20] [21] [22] [23] [24]         ← Features (1:55-2:35)
[25] [26] [27] [28] [29] [30]              ← Transformação (2:35-2:55)
[31] [32] [33] [34] [35] [36] [37] [38] [39] [40] ← CTA (2:55-3:30)
```

### Dicas de timing por clip
- **Cenas 1-8 (Hook/Problema):** Deixe cada clip com 5-7s. Pausas dramáticas entre cena 07 e 08.
- **Cenas 9-24 (Solução/Features):** Clips mais rápidos (4-6s). Ritmo acelerado.
- **Cenas 25-30 (Transformação):** Clips com 5-7s. Momentos emocionais.
- **Cenas 31-40 (CTA):** Clips de 3-5s. Ritmo acelerado até o final.

---

## PASSO 4 — Adicionar Narração

1. Arraste os áudios de narração para a **track de áudio** abaixo do vídeo
2. Posicione conforme abaixo:

```
AUDIO TRACK:
[audio-01-hook]──[audio-02-problema]──[audio-03-solucao]──[audio-04-features]──
[audio-05-modulos]──[audio-06-jogos]──[audio-07-metodo]──
[audio-08-transformacao]──[audio-09-cta]

TIMELINE:
0:00 ──── 0:18 ──── 0:34 ──── 0:48 ──── 1:00 ──── 1:16 ──── 1:30 ──── 1:42 ──── 1:54 ──── 2:12
```

3. Ajuste o posição de cada áudio para sincronizar com os clips correspondentes
4. Haja pausas de 1-2s entre chunks (deixe só a música)

---

## PASSO 5 — Adicionar Música de Fundo

1. Arraste as 4 faixas音乐 para uma **segunda track de áudio**
2. Posicione:

```
MÚSICA TRACK:
[musica-01-hook]──────────────[musica-02-solucao]────[musica-03-features]──────────[musica-04-cta]
(0:00 ─── 0:50)              (0:50 ── 1:25)         (1:25 ─── 2:35)                (2:35 ── 3:30)
```

3. **Volume da música:** reduza para **-18 dB a -22 dB**
   - Clique na track → Volume → ajuste para ~20%
4. Adicione **crossfade** de 2s entre cada faixa musical
   - No ponto de transição, adicione fade-out na faixa anterior e fade-in na próxima

---

## PASSO 6 — Legendas

### Método 1 — Legendas automáticas (CapCut)
1. Clique em **"Legendas"** → **"Legendas automáticas"**
2. Selecione Português
3. O CapCut transcreve a narração automaticamente
4. Revise e corrija erros de transcrição

### Método 2 — Legendas manuais (mais controle)
1. Clique em **"Texto"** → **"Adicionar texto"**
2. Digite cada frase da narração
3. Posicione na parte inferior da tela

### Formato das legendas
- **Fonte:** Montserrat Bold (ou similar sans-serif)
- **Tamanho:** 36-44px
- **Cor:** Branco
- **Sombra:** Preta, 2px de deslocamento
- **Posição:** 15% da parte inferior
- **Fundo:** None (transparente) ou retângulo preto semi-transparente

---

## PASSO 7 — Transições

Use transições sutis entre os atos:

| Ponto | Transição | Duração |
|-------|-----------|---------|
| Cenas 08→09 (Problema → Solução) | **Dissolve** | 1.5s |
| Cenas 14→15 (Módulos → Jogos) | **Cut** direto | 0s |
| Cenas 24→25 (Features → Transformação) | **Fade to black** | 1.0s |
| Cenas 30→31 (Transformação → CTA) | **Dissolve** | 0.8s |
| Cenas 39→40 (Logo → Fade final) | **Fade to black** | 2.0s |

**Regra geral:** Entre clips dentro do mesmo ato, use **cortes diretos** (sem transição). Transições apenas entre atos diferentes.

---

## PASSO 8 — Efeitos Visuais

### Efeitos recomendados (CapCut)
1. **Zoom lento** (Ken Burns): aplique em clips estáticos para dar movimento
   - Selecione clip → Animations → Combo → "Zoom In" ou "Zoom Out"
2. **Bloom/Glow**: aplique nos clips de reveal (09, 36, 39)
   - Efeitos → Basic → "Glow"
3. **Film grain sutil**: aplique nos clips dramáticos (01-08)
   - Efeitos → Retro → "Film Grain"
4. **Speed ramp**: aplique no clip 30 (criança andando na escola)
   - Selecione → Speed → Curve → selecione "Montage"

---

## PASSO 9 — Ajustes Finais

### Color grading
1. Selecione todos os clips
2. Ajustes → **Contraste:** +10
3. Ajustes → **Saturação:** +15
4. Ajustes → **Temperatura:** +5 (mais quente)
5. Para clips 01-08 (problema): reduza saturação para -20 (tons frios)

### Áudio final
1. **Narração:** -3 dB (padrão)
2. **Música:** -20 dB (fundo)
3. Adicione **normalização** de áudio no CapCut
4. Teste em fones de ouvido e caixas de som

### Exportação
1. Clique **"Exportar"**
2. Resolução: **1920x1080** (ou 1080x1920 se vertical)
3. Formato: **MP4**
4. Qualidade: **Alta**
5. Frame rate: **30 FPS**
6. Clique **"Exportar"**

---

## CHECKLIST FINAL

- [ ] Todos os 40 clips posicionados
- [ ] 9 áudios de narração sincronizados
- [ ] 4 faixas音乐 posicionadas com volume correto
- [ ] Legendas revisadas e corrigidas
- [ ] Transições entre atos aplicadas
- [ ] Zoom/ken burns nos clips estáticos
- [ ] Color grading aplicado
- [ ] Mixagem de áudio finalizada
- [ ] Vídeo assistido do início ao fim
- [ ] Exportado em MP4 1080p
- [ ] Subido no YouTube (unlisted)
- [ ] Link colocado no Kiwify
