//@ts-check
import { n } from "./dom.mjs"

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

function init() {
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

    startButtons = document.body.querySelectorAll("button.start")
    answerType = document.body.querySelectorAll("input[name='answerType']")

    importButton?.addEventListener("click", () => importFile.click())
    importFile?.addEventListener("change", async (ev) => {
        if (ev.target.files?.length === 1) {
            const textContent = await ev.target.files[0].text()
            addSet(textContent)
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
}

function onAnswer(ev) {
    if (inresult) {
        return
    }
    inresult = true
    const item = current[i]
    const correct = item.a.toLowerCase().trim() === ev.target.value.toLowerCase().trim()
    item.correct = correct
    const text = correct ? "" + item.q + " " + item.a : "" + item.q + " " + item.a
    ev.target.value = ""
    const color = correct ? "var(--ok)" : "var(--error)"
    questionElement.replaceChildren(n('span', [text], { style: `color:${color}` }))
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
            const actionsRow = n('div', [
                statsBtn,
                loadBtn
            ], { class: 'row' })
            const row = n('div', [
                s.name + (active ? ' (Activ)' : ''),
                actionsRow
            ], { class: 'spaced-row' })
            return row
        })
    )
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
            n('span', it.q),
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

function addSet(content) {
    loadedSet = JSON.parse(content)
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
    addSet(textContent)
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
            it.q + " " + it.a + " " + it.c
            return n('div', [
                it.q,
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
        while (itemStats.length > 5) {
            itemStats.shift()
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
    console.log(notPracticed, notPerfect, perfect)
    current = []
    for (let j = 0; j < 5; j++) {
        current.push(...shuffle(structuredClone(picked)))
    }

    i = 0
    renderQuestion()
}

function renderQuestion() {
    summaryElement.replaceChildren()
    questionElement.replaceChildren()
    questionElement.innerText = current[i].q
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