//@ts-check
import { n } from "./dom.mjs"
import { mores } from "./more.js"

let introElement = null
let questionElement = null
let progressElement = null
let summaryElement = null
let statsDialog = null
let answerInput = null
let answerMc = null
let answerType = null
let importButton = null
let startButtons = null
let importFile = null
let timeInput = null
let loadedSet = {}
let current = []
let i = 0
let inresult = false
let stats = {}
let sets = []
let mc = false;
let soundsInput = null
let soundsPlayBtn = null
let soundsOutput = null
let kuroshiro = null

async function init() {
    introElement = document.body.querySelector("intro")
    questionElement = document.body.querySelector("question")
    summaryElement = document.body.querySelector("summary")
    progressElement = document.body.querySelector("status")
    answerInput = document.body.querySelector("answer input")
    answerMc = document.body.querySelector("answer div#mc")
    importButton = document.body.querySelector("button#import")
    importFile = document.body.querySelector("input#importFile")
    timeInput = document.body.querySelector("input#time")
    statsDialog = document.body.querySelector("dialog#stats")

    soundsInput = document.body.querySelector("input#soundsInput")
    soundsOutput = document.body.querySelector("p#soundsOutput")
    soundsPlayBtn = document.body.querySelector("button#soundsPlayBtn")
    soundsInput?.addEventListener("input", async (ev) => {
        soundsOutput.replaceChildren(await sounds(ev.target.value))
    })
    soundsPlayBtn?.addEventListener("click", async (ev) => {
        read(soundsInput.value)
    })

    startButtons = document.body.querySelectorAll("button.start")
    answerType = document.body.querySelectorAll("input[name='answerType']")

    importButton?.addEventListener("click", () => importFile.click())
    importFile?.addEventListener("change", async (ev) => {
        if (ev.target.files?.length === 1) {
            const textContent = await ev.target.files[0].text()
            await addSet(textContent)
            ev.target.closest('dialog').close()
        }
    })

    answerInput?.addEventListener("keydown", (ev) => {
        if (ev.key?.toLowerCase() === "ENTER".toLowerCase()) {
            onAnswer(ev)
        }
    })

    startButtons.forEach(b => b.addEventListener("click", () => beginSession()))

    answerType.forEach(inp => inp.addEventListener("change", (e) => {
        mc = e?.target?.value === "mc"
        if (i + 1 < current.length) {
            renderQuestion()
        }
    }))

    readStateFromStorage()

    if (loadedSet?.name) {
        progressElement?.replaceChildren(`Aktuelles Set: ${loadedSet.name}`)
    }
    addPremateSets()
    addPresentSets()
    await initKuroshiro()

    if (soundsInput?.value && soundsOutput) {
        soundsOutput.replaceChildren(await sounds(soundsInput.value))
    }
}

async function initKuroshiro() {
    kuroshiro = new window.Kuroshiro.default
    await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "vendor/kuromoji/dict/" }))
}

function onAnswer(ev) {
    if (inresult) {
        return
    }
    inresult = true
    const item = current[i]
    const correct = item.a.toLowerCase().trim() === ev.target.value.toLowerCase().trim()
    item.correct = correct
    ev.target.value = ""
    const color = correct ? "var(--ok)" : "var(--error)"
    questionElement.replaceChildren(n('span', [renderWithFurigana(`${item.q} ${item.a}`)], { style: `color:${color}` }))
    setTimeout(() => {
        if (i + 1 < current.length) {
            i = i + 1
            renderQuestion()
        } else {
            done()
        }
        inresult = false
    }, +(timeInput?.value ?? 5) * 1000);
}

function addPremateSets() {
    const premades = [
        ['Alle Hiragana', URL.parse('hiragana-grind.json', location.href)],
        ['Ein Zeichen Hiragana', URL.parse('hiragana-single-grind.json', location.href)],
        ['Zwei Zeichen Hiragana', URL.parse('hiragana-duo-grind.json', location.href)],
        ['Ein Zeichen Hiragana mit Diakrata', URL.parse('hiragana-single-dia-grind.json', location.href)],
        ['Zwei Zeichen Hiragana mit Diakrata', URL.parse('hiragana-duo-dia-grind.json', location.href)],
        ['Test', URL.parse('test.json', location.href)],
    ]
    document.querySelector("#premadeSets")?.replaceChildren(
        ...premades.map(p => {
            return n('button', [p[0]], {
                $click: async (ev) => {
                    await fetchSet(p[1])
                    ev.target.closest('dialog').close()
                }
            })
        })
    )
}

function addPresentSets() {
    document.querySelector("#localSets")?.replaceChildren(
        ...sets.map(s => {
            const active = loadedSet.key === s.key
            const loadBtn = n('button', [`Laden`], {
                $click: (ev) => {
                    loadSet(s)
                    ev.target.closest('dialog').close()
                    addPresentSets()
                },
                disabled: active
            })
            const statsBtn = n('button', [`Stats`], {
                $click: (ev) => {
                    showStats(s)
                }
            })
            const deleteBtn = n('button', [`Löschen`], {
                $click: async (ev) => {
                    if (await confirmDialog(`Set ${s.name} wirklich löschen?`)) {
                        deleteSet(s)
                        ev.target.closest('dialog').close()
                        addPresentSets()
                    }
                }
            })
            const actionsRow = n('div', [
                statsBtn,
                loadBtn,
                deleteBtn
            ], { class: 'row' })
            const row = n('div', [
                s.name + (active ? ' (Activ)' : ''),
                actionsRow
            ], { class: 'spaced-row' })
            return row
        })
    )
}

function deleteSet(set) {
    sets = sets.filter(s => s !== set)
}

function createDialog(header, content, buttons, onClose) {
    const id = crypto.randomUUID()
    return n('dialog', [
        n('div', [
            n('header', [
                n('h2', header),
                n('button', ['X'], { class: "dialog-close", command: "close", commandfor: id })
            ]),
            n('div', content),
            n('div', buttons, { class: "buttonline" })
        ], { class: "dialog-container" })
    ], { id, $close: () => onClose() })
}

function confirmDialog(query) {
    return new Promise((resolve, reject) => {
        const dialog = createDialog(
            "Achtung",
            query,
            [n('button', ['Ja'], {
                $click: () => {
                    resolve(true)
                    dialog.remove()
                }
            }), n('button', ['Nein'], {
                $click: () => {
                    resolve(false)
                    dialog.remove()
                }
            })],
            () => resolve(false)
        )
        document.body.append(dialog)
        dialog.showModal()
    })
}

function showStats(set) {
    const contentElement = statsDialog.querySelector("content")
    const selectedStats = stats[set.key] ?? {}
    const displayStats = { ...selectedStats }
    Object.values(set.nudges).forEach(nudge => {
        const key = `q${nudge.q}_a${nudge.a}`
        if (!displayStats[key]) {
            displayStats[key] = { q: nudge.q, a: nudge.a, h: [[]] }
        }
    })
    const children = Object.values(displayStats).sort((a, b) => {
        const ah = a.h.flat(1)
        const bh = b.h.flat(1)
        const ld = ah.length - bh.length;
        if (ah.length == 0 || bh.length == 0) {
            return ld
        }
        if (ld === 0) {
            return ah.filter(Boolean).length - bh.filter(Boolean).length
        }
        return ld
    }).map(it => {
        return n('div', [
            n('span', renderWithFurigana(it.q)),
            n('span', it.a),
            n('div', it.h.map(h => n('div', h.map(c => box(c)), { style: "display:flex; justify-content:end;" })), { style: "flex-grow:1;" })
        ], { style: "display: flex;  gap: var(--space); padding:4px; justify-content: space-between;" })
    })
    contentElement.replaceChildren(...children)
    statsDialog.showModal()
}

function loadSet(set) {
    loadedSet = set
    if (loadedSet?.name) {
        progressElement?.replaceChildren(`Aktuelles Set: ${loadedSet.name}`)
    }
    summaryElement.replaceChildren()
    questionElement.replaceChildren()
    localStorage.setItem('mini', JSON.stringify(loadedSet ?? {}) ?? '{}')
    answerInput.setAttribute('hidden', "true")
    answerMc.replaceChildren()
    introElement.removeAttribute('hidden')
}

async function addSet(content) {
    const parsed = JSON.parse(content)
    if (sets.find(s => s.key === parsed.key)) {
        if (!(await confirmDialog("Set existiert bereits. Set überschreiben?"))) {
            return
        }
        sets = sets.filter(s => s.key !== parsed.key)
    }
    loadedSet = parsed
    if (loadedSet?.name) {
        progressElement?.replaceChildren(`Aktuelles Set: ${loadedSet.name}`)
    }
    summaryElement.replaceChildren()
    questionElement.replaceChildren()
    localStorage.setItem('mini', JSON.stringify(loadedSet ?? {}) ?? '{}')
    sets.push(loadedSet)
    localStorage.setItem('mini:sets', JSON.stringify(sets ?? []) ?? '[]')
    addPresentSets()
    answerInput.setAttribute('hidden', "true")
    answerMc.replaceChildren()
    introElement.removeAttribute('hidden')
}

async function fetchSet(url) {
    const textContent = await (await fetch(url)).text()
    await addSet(textContent)
}

function done() {
    questionElement.innerText = "Fertig"
    const currentStats = current.reduce((acc, cur) => {
        const p = acc.find((i) => i.q === cur.q)
        if (p) {
            p.c.push(cur.correct)
        } else {
            const n = {
                ...cur,
                c: [cur.correct]
            }
            acc.push(n)
        }
        return acc
    }, [])
    updateStats(currentStats)
    summaryElement.replaceChildren(
        ...currentStats.map(it => {
            return n('div', [
                renderWithFurigana(it.q),
                " ",
                it.a,
                " ",
                n('div', it.c.map(c => box(c)), { style: "display:flex;" })
            ], { style: "display: flex;  gap: 8px;  align-items: baseline;  justify-content: space-between;" })
        })
    )
    answerInput.setAttribute('hidden', "true")
    answerMc.replaceChildren()
}

function updateStats(currentStats) {
    stats = JSON.parse(localStorage.getItem("mini:stats") ?? '{}') ?? {}
    const key = loadedSet.key
    if (!stats[key]) {
        stats[key] = {}
    }
    const setStats = stats[key]
    currentStats.forEach(item => {
        const key = `q${item.q}_a${item.a}`
        if (!setStats[key]) {
            setStats[key] = { q: item.q, a: item.a, h: [] }
        }
        const itemStats = setStats[key]
        if (item.c) {
            itemStats.h.push(item.c)
        }
        while (itemStats.h.length > 5) {
            itemStats.h.shift()
        }
    })
    localStorage.setItem("mini:stats", JSON.stringify(stats ?? {}) ?? '{}')
}

function box(correct) {
    const el = document.createElement("div")
    el.style.backgroundColor = correct ? "var(--ok)" : "var(--error)"
    el.style.width = "1ch"
    el.style.height = "1ch"
    el.style.border = "1px solid var(--dark)"
    return el
}

function beginSession() {
    const nudges = loadedSet.nudges
    if (!nudges) {
        alert("keine Daten vorhanden")
        return
    }
    const selectionStats = stats[loadedSet.key] ?? {}
    //copy
    const nudgeCopy = structuredClone(nudges)
    //shuffle
    const shuffled = shuffle(Object.values(nudgeCopy))
    const picked = []
    //pick not practiced
    const notPracticed = shuffled.filter((item) => {
        const key = `q${item.q}_a${item.a}`
        const itemStats = selectionStats[key] ?? {};
        return (itemStats.h ?? []).length < 3
    })
    picked.push(...notPracticed.slice(0, 5))
    //fill with not perfect
    const notPerfect = shuffled.filter((item) => {
        const key = `q${item.q}_a${item.a}`
        const itemStats = selectionStats[key] ?? {};
        return (itemStats.h ?? []).length >= 3 && (itemStats.h ?? []).flat(1).filter((i) => !i).length > 0
    })
    picked.push(...notPerfect.slice(0, 5 - picked.length))
    //fill with perfect
    const perfect = shuffled.filter((item) => {
        const key = `q${item.q}_a${item.a}`
        const itemStats = selectionStats[key] ?? {};
        return (itemStats.h ?? []).length >= 3 && (itemStats.h ?? []).flat(1).filter((i) => !i).length === 0
    })
    picked.push(...perfect.slice(0, 5 - picked.length))
    current = []
    for (let j = 0; j < 5; j++) {
        current.push(...shuffle(structuredClone(picked)))
    }

    i = 0
    renderQuestion()
}

function renderWithFurigana(q) {
    const FURIGANA_START = '【'
    const FURIGANA_END = '】'
    if (window.Kuroshiro.default.Util.hasKanji(q)) {
        const target = n('p', [])
        kuroshiro.convert(q, { mode: "okurigana", to: "hiragana", delimiter_start: FURIGANA_START, delimiter_end: FURIGANA_END }).then(v => {
            const content = []
            let text = ""
            let inRp = false
            let inRuby = false
            let ruby = n('ruby')
            for (let i = 0; i < v.length; i++) {
                const c = v.charAt(i)
                if (c == FURIGANA_START || c == FURIGANA_END) {
                    if (inRp) {
                        ruby.append(n('rt', [text]))
                    } else {
                        ruby.append(n('span', [text]))
                    }
                    text = ""
                    ruby.append(n("rp", [c]))
                    if (c == FURIGANA_START) {
                        inRp = true
                    }
                    if (c == FURIGANA_END) {
                        inRp = false
                        content.push(ruby)
                        inRuby = false
                        ruby = n('ruby')
                    }
                } else if (window.Kuroshiro.default.Util.isKanji(c)) {
                    content.push(n('span', [text]))
                    text = ""
                    inRuby = true
                    ruby.append(c)
                } else {
                    text += c
                }
            }
            if (text.length > 0) {
                content.push(n('span', [text]))
            }
            target.replaceChildren(...content)
        })
        return target
    } else {
        return n('span', q)
    }
}

function read(gana) {
    const vObj = getVoice()
    if (vObj) {
        const { voice, synth } = vObj
        const utterThis = new SpeechSynthesisUtterance(gana);
        utterThis.voice = voice
        synth.speak(utterThis);
    }
}

async function sounds(gana) {
    return await kuroshiro.convert(gana, { mode: "okurigana", to: "hiragana", delimiter_start: "(", delimiter_end: ")" }).then(trans => {
        Object.entries(mores).toSorted((a, b) => b[0].length - a[0].length).forEach(([k, v]) => trans = trans.replaceAll(k, v))
        return trans
    })
}

function getVoice() {
    const synth = window.speechSynthesis;
    if (!synth) {
        return
    }
    const voice = synth.getVoices().filter(v => v.lang == "ja-JP")[0]
    if (!voice) {
        return
    }
    return { voice, synth }
}

function renderQuestion() {
    summaryElement.replaceChildren()
    const q = current[i].q
    const v = getVoice()
    const kj = window.Kuroshiro.default.Util.hasKanji(q);
    const playBtn = n('button', ['▶'], { $click: () => read(q) })
    questionElement.replaceChildren(renderWithFurigana(q), (kj && v) ? playBtn : "")
    progressElement.innerText = i + 1 + "/" + current.length
    answerMc.replaceChildren()

    // multiple choice
    if (mc) {
        answerInput.setAttribute('hidden', "true")
        const shuffledOptions = getChoices(current[i].a)
        answerMc.replaceChildren(...shuffledOptions.map(o => n('button', o, { value: o, $click: (ev) => onAnswer(ev), class: "choice" })))
    } else {
        answerInput.removeAttribute("hidden")
        if (!document.activeElement) {
            answerInput.focus()
        }
    }
    introElement.setAttribute('hidden', "true")
}

function getChoices(a) {
    const nudges = loadedSet.nudges
    //copy
    const nudgeCopy = structuredClone(nudges)
    //shuffle
    const shuffled = shuffle(Object.values(nudgeCopy))
    //pick
    const options = shuffled.map(o => o.a).filter(o => o !== a).slice(0, 2)
    options.push(a)
    const shuffledOptions = shuffle(options)
    return shuffledOptions
}

// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}

function readStateFromStorage() {
    loadedSet = JSON.parse(localStorage.getItem("mini") ?? '{}') ?? {}
    stats = JSON.parse(localStorage.getItem("mini:stats") ?? '{}') ?? {}
    sets = JSON.parse(localStorage.getItem("mini:sets") ?? '[]') ?? []
}

init()