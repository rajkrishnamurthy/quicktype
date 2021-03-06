"use strict";

import { Base64 } from "js-base64";

import { panic } from "./Support";
import { encodedMarkovChain } from "./EncodedMarkovChain";
import * as pako from "pako";

// This must be null, not undefined, because we read it from JSON.
export type SubTrie = number | null | Trie;
export type Trie = {
    count: number;
    arr: SubTrie[];
};

export type MarkovChain = {
    trie: Trie;
    depth: number;
};

function makeTrie(): Trie {
    const arr: SubTrie[] = [];
    for (let i = 0; i < 128; i++) {
        arr.push(null);
    }
    return { count: 0, arr };
}

function lookup(t: Trie, seq: string, i: number): number | undefined {
    let first = seq.charCodeAt(i);
    if (first >= 128) {
        first = 0;
    }

    if (i >= seq.length - 1) {
        if (typeof t !== "object") {
            return panic("Malformed trie");
        }
        const n = t.arr[first];
        if (n === null) {
            return undefined;
        }
        if (typeof n === "object") {
            return panic("Malformed trie");
        }
        return n / t.count;
    }

    const st = t.arr[first];
    if (st === null) {
        return undefined;
    }
    if (typeof st !== "object") {
        return panic("Malformed trie");
    }
    return lookup(st, seq, i + 1);
}

function increment(t: Trie, seq: string, i: number): void {
    let first = seq.charCodeAt(i);
    if (first >= 128) {
        first = 0;
    }

    if (i >= seq.length - 1) {
        if (typeof t !== "object") {
            return panic("Malformed trie");
        }
        let n = t.arr[first];
        if (n === null) {
            n = 0;
        } else if (typeof n === "object") {
            return panic("Malformed trie");
        }
        t.arr[first] = n + 1;
        t.count += 1;
        return;
    }

    let st = t.arr[first];
    if (st === null) {
        t.arr[first] = st = makeTrie();
    }
    if (typeof st !== "object") {
        return panic("Malformed trie");
    }
    return increment(st, seq, i + 1);
}

export function train(lines: string[], depth: number): MarkovChain {
    const trie = makeTrie();
    for (const l of lines) {
        for (let i = depth; i <= l.length; i++) {
            increment(trie, l.substr(i - depth, depth), 0);
        }
    }

    return { trie, depth };
}

export function load(): MarkovChain {
    const bytes = Base64.atob(encodedMarkovChain);
    return JSON.parse(pako.inflate(bytes, { to: "string" }));
}

export function evaluate(mc: MarkovChain, word: string): number {
    const { trie, depth } = mc;
    if (word.length < depth) {
        return 1;
    }
    let p = 1;
    for (let i = depth; i <= word.length; i++) {
        let cp = lookup(trie, word.substr(i - depth, depth), 0);
        if (cp === undefined) {
            cp = 0.0001;
        }
        p = p * cp;
    }
    return Math.pow(p, 1 / (word.length - depth + 1));
}

function testWord(mc: MarkovChain, word: string): void {
    console.log(`"${word}": ${evaluate(mc, word)}`);
}

export function test(): void {
    const mc = load();

    testWord(mc, "url");
    testWord(mc, "json");
    testWord(mc, "my_property");
    testWord(mc, "ordinary");
    testWord(mc, "different");
    testWord(mc, "189512");
    testWord(mc, "2BTZIqw0ntH9MvilQ3ewNY");
    testWord(mc, "0uBTNdNGb2OY5lou41iYL52LcDq2");
    testWord(mc, "-KpqHmWuDOUnr1hmAhxp");
    testWord(mc, "granularity");
    testWord(mc, "coverage");
    testWord(mc, "postingFrequency");
    testWord(mc, "dataFrequency");
    testWord(mc, "units");
    testWord(mc, "datasetOwner");
    testWord(mc, "organization");
    testWord(mc, "timePeriod");
    testWord(mc, "contactInformation");

    testWord(
        mc,
        "\ud83d\udebe \ud83c\udd92 \ud83c\udd93 \ud83c\udd95 \ud83c\udd96 \ud83c\udd97 \ud83c\udd99 \ud83c\udfe7"
    );
}
