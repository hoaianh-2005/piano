
const pianoElement = document.getElementById("piano");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");

const musicInput = document.getElementById("musicInput");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const clearButton = document.getElementById("clearButton");
const exampleButton = document.getElementById("exampleButton");

const tempo = document.getElementById("tempo");
const tempoValue = document.getElementById("tempoValue");
const playStatus = document.getElementById("playStatus");

const WHITE_WIDTH = 38;
const BLACK_WIDTH = 24;

let pianoSound = null;
let reverb = null;
let loadingPromise = null;
let isReady = false;
let isPlaying = false;
let playbackId = 0;

const activeNotes = new Set();
const heldKeys = new Set();
const pointerNotes = new Map();

/* =========================
   1. TẠO 88 NỐT
========================= */

const allNotes = [];

for (let midi = 21; midi <= 108; midi++) {
    allNotes.push(
        Tone.Frequency(midi, "midi").toNote()
    );
}

function isBlack(note) {
    return note.includes("#");
}

function setStatus(message, state) {
    statusText.textContent = message;
    statusDot.className = state;
}

/* =========================
   2. TẠO BÀN PHÍM
========================= */

function createPiano() {
    pianoElement.innerHTML = "";

    let whiteIndex = 0;
    const whitePositions = {};

    allNotes.forEach(note => {
        if (!isBlack(note)) {
            whitePositions[note] = whiteIndex;
            whiteIndex++;
        }
    });

    pianoElement.style.width =
        `${whiteIndex * WHITE_WIDTH}px`;

    allNotes.forEach(note => {
        const key = document.createElement("div");
        key.dataset.note = note;

        if (isBlack(note)) {
            key.className = "black-key";

            const parts = note.match(/^([A-G])#(\d)$/);

            const baseNote =
                parts[1] + Number(parts[2]);

            const position = whitePositions[baseNote];

            key.style.left =
                `${(position + 1) * WHITE_WIDTH - BLACK_WIDTH / 2}px`;

        } else {
            key.className = "white-key";

            const position = whitePositions[note];

            key.style.left =
                `${position * WHITE_WIDTH}px`;
        }

        key.innerHTML = `<span>${note}</span>`;

        key.addEventListener("pointerdown", async event => {
            event.preventDefault();

            key.setPointerCapture(event.pointerId);

            pointerNotes.set(event.pointerId, note);

            await playNote(note);
        });

        function releasePointer(event) {
            const releasedNote =
                pointerNotes.get(event.pointerId);

            if (releasedNote) {
                stopNote(releasedNote);
                pointerNotes.delete(event.pointerId);
            }
        }

        key.addEventListener("pointerup", releasePointer);
        key.addEventListener("pointercancel", releasePointer);

        pianoElement.appendChild(key);
    });
}

/* =========================
   3. TẢI ÂM THANH PIANO
========================= */

const sampleNotes = [
    "A0", "C1", "D#1", "F#1",
    "A1", "C2", "D#2", "F#2",
    "A2", "C3", "D#3", "F#3",
    "A3", "C4", "D#4", "F#4",
    "A4", "C5", "D#5", "F#5",
    "A5", "C6", "D#6", "F#6",
    "A6", "C7", "D#7", "F#7",
    "A7", "C8"
];

const sampleUrls = {};

sampleNotes.forEach(note => {
    const filename = note.replace("#", "s");
    sampleUrls[note] = filename + ".mp3";
});

async function initializePiano() {
    if (isReady) return;

    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            if (typeof Tone === "undefined") {
                throw new Error("Không tải được Tone.js");
            }

            setStatus("Đang tải âm thanh piano...", "loading");

            await Tone.start();

            reverb = new Tone.Reverb({
                decay: 2,
                wet: 0.18
            }).toDestination();

            await reverb.ready;

            pianoSound = new Tone.Sampler({
                urls: sampleUrls,
                release: 1.5,
                baseUrl: "https://tonejs.github.io/audio/salamander/"
            }).connect(reverb);

            await Tone.loaded();

            isReady = true;

            setStatus("Piano đã sẵn sàng", "ready");

        } catch (error) {
            console.error(error);

            setStatus("Lỗi tải âm thanh", "error");

            loadingPromise = null;

            throw error;
        }
    })();

    return loadingPromise;
}

/* =========================
   4. PHÁT VÀ DỪNG NỐT
========================= */

async function playNote(note, velocity = 0.8) {
    try {
        await initializePiano();

        if (activeNotes.has(note)) return;

        activeNotes.add(note);

        const key = document.querySelector(
            `[data-note="${note}"]`
        );

        if (key) key.classList.add("active");

        pianoSound.triggerAttack(
            note,
            undefined,
            velocity
        );

    } catch (error) {
        console.error(error);
    }
}

function stopNote(note) {
    if (!activeNotes.has(note)) return;

    activeNotes.delete(note);

    const key = document.querySelector(
        `[data-note="${note}"]`
    );

    if (key) key.classList.remove("active");

    if (isReady && pianoSound) {
        pianoSound.triggerRelease(note);
    }
}

function stopAllNotes() {
    [...activeNotes].forEach(stopNote);
}

/* =========================
   5. BÀN PHÍM MÁY TÍNH
========================= */

const keyboardMap = {
    A: "C4",
    W: "C#4",
    S: "D4",
    E: "D#4",
    D: "E4",
    F: "F4",
    T: "F#4",
    G: "G4",
    Y: "G#4",
    H: "A4",
    U: "A#4",
    J: "B4",
    K: "C5"
};

document.addEventListener("keydown", event => {
    if (event.repeat) return;

    if (
        event.target.tagName === "TEXTAREA" ||
        event.target.tagName === "INPUT"
    ) return;

    const key = event.key.toUpperCase();
    const note = keyboardMap[key];

    if (!note || heldKeys.has(key)) return;

    heldKeys.add(key);
    playNote(note);
});

document.addEventListener("keyup", event => {
    const key = event.key.toUpperCase();
    const note = keyboardMap[key];

    if (!note) return;

    heldKeys.delete(key);
    stopNote(note);
});

window.addEventListener("blur", () => {
    heldKeys.clear();
    stopAllNotes();
});

/* =========================
   6. ĐỌC KÝ HIỆU ÂM NHẠC
========================= */

function normalizeNote(note) {
    const flats = {
        DB: "C#",
        EB: "D#",
        GB: "F#",
        AB: "G#",
        BB: "A#"
    };

    const match = note.match(/^([A-G])([#B]?)(\d)$/);

    if (!match) return null;

    const name = match[1] + match[2];
    const octave = match[3];

    const normalizedName = flats[name] || name;
    const result = normalizedName + octave;

    return allNotes.includes(result) ? result : null;
}

/*
C4:1 = Nốt đen
C4:2 = Nốt trắng
C4:4 = Nốt tròn
C4:0.5 = Nốt móc đơn
C4:0.25 = Nốt móc kép

R:1 = Nghỉ một phách

[C4,E4,G4]:1 = Hợp âm

C#4:1 = Nốt thăng
Db4:1 = Nốt giáng

C4:1:0.5 = Âm lượng 50%
*/

function parseMusic(text) {
    const tokens = text
        .replace(/\n/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const result = [];

    for (const token of tokens) {
        const parts = token.split(":");

        const notePart = parts[0].toUpperCase();

        const duration = Number(parts[1] || 1);
        const velocity = Number(parts[2] || 0.8);

        if (
            !Number.isFinite(duration) ||
            duration <= 0 ||
            !Number.isFinite(velocity)
        ) continue;

        const safeDuration = Math.min(duration, 8);
        const safeVelocity = Math.max(
            0,
            Math.min(1, velocity)
        );

        if (notePart === "R") {
            result.push({
                notes: [],
                duration: safeDuration
            });

            continue;
        }

        let notes = [];

        if (
            notePart.startsWith("[") &&
            notePart.endsWith("]")
        ) {
            notes = notePart
                .slice(1, -1)
                .split(",")
                .map(normalizeNote);

        } else {
            const note = normalizeNote(notePart);

            if (note) notes = [note];
        }

        if (
            notes.length > 0 &&
            notes.every(note => note !== null)
        ) {
            result.push({
                notes,
                duration: safeDuration,
                velocity: safeVelocity
            });
        }
    }

    return result;
}

/* =========================
   7. PHÁT BẢN NHẠC
========================= */

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function playMusic() {
    if (isPlaying) return;

    const music = parseMusic(musicInput.value);

    if (music.length === 0) {
        playStatus.textContent = "⚠ Chưa có nốt hợp lệ";
        return;
    }

    try {
        await initializePiano();
    } catch {
        return;
    }

    isPlaying = true;

    const thisPlayback = ++playbackId;

    playButton.disabled = true;

    playStatus.textContent = "● Đang phát";

    const bpm = Number(tempo.value);
    const beatTime = 60000 / bpm;

    for (const event of music) {
        if (thisPlayback !== playbackId) break;

        const duration = beatTime * event.duration;

        if (event.notes.length > 0) {
            await Promise.all(
                event.notes.map(note =>
                    playNote(note, event.velocity)
                )
            );

            await wait(duration * 0.9);

            if (thisPlayback !== playbackId) break;

            event.notes.forEach(stopNote);

            await wait(duration * 0.1);

        } else {
            await wait(duration);
        }
    }

    if (thisPlayback === playbackId) {
        stopAllNotes();

        isPlaying = false;
        playButton.disabled = false;

        playStatus.textContent = "● Đã phát xong";
    }
}

function stopMusic() {
    playbackId++;

    isPlaying = false;

    stopAllNotes();

    playButton.disabled = false;

    playStatus.textContent = "■ Đã dừng";
}

/* =========================
   8. CÁC NÚT ĐIỀU KHIỂN
========================= */

playButton.addEventListener("click", playMusic);

stopButton.addEventListener("click", stopMusic);

clearButton.addEventListener("click", () => {
    stopMusic();

    musicInput.value = "";

    playStatus.textContent = "● Đã xóa bản nhạc";
});

/* =========================
   9. BẢN NHẠC MẪU
========================= */

exampleButton.addEventListener("click", () => {
    musicInput.value =
`[C4,E4,G4]:2
C5:0.5 E5:0.5 G5:1
[E4,G4,C5]:2
R:0.5
[D4,F4,A4]:1
C5:0.5 D5:0.5 E5:2

[C4,E4,G4]:1
G4:0.5 A4:0.5 C5:1
[E4,G4,B4]:2
R:1
[F4,A4,C5]:2
E5:1 D5:1 C5:2

[C5,E5,G5]:2
[D5,F5,A5]:2
[E5,G5,C6]:2
R:1
[C5,E5,G5]:1
[A4,C5,E5]:1
[G4,B4,D5]:2

C5:0.5 E5:0.5 G5:1
A5:1 G5:1 E5:2
F5:1 A5:1 C6:2
G5:1 E5:1 D5:2

[C4,E4,G4]:4
C5:1 G4:1 E4:1 C4:2`;

    playStatus.textContent = "♪ Đã tải bản nhạc mẫu";
});

/* =========================
   10. ĐIỀU CHỈNH TEMPO
========================= */

tempo.addEventListener("input", () => {
    tempoValue.textContent = `${tempo.value} BPM`;
});

/* =========================
   11. KHỞI ĐỘNG
========================= */

createPiano();
