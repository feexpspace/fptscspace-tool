// src/components/extensions/CustomHighlight.ts
import Highlight from '@tiptap/extension-highlight';
import { mergeAttributes } from '@tiptap/core';

// --- PHẦN 1: MỞ RỘNG TYPE DEFINITION ---
// Tạo tên command mới để tránh xung đột với 'highlight' gốc
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        customHighlight: {
            /**
             * Set a highlight mark with optional color and id
             */
            setCustomHighlight: (attributes?: { color?: string; id?: string }) => ReturnType;
            /**
             * Toggle a highlight mark with optional color and id
             */
            toggleCustomHighlight: (attributes?: { color?: string; id?: string }) => ReturnType;
            /**
             * Unset a highlight mark
             */
            unsetCustomHighlight: () => ReturnType;
        };
    }
}

// --- PHẦN 2: LOGIC EXTENSION ---
export const CustomHighlight = Highlight.extend({
    // 1. Thêm thuộc tính ID
    addAttributes() {
        return {
            // Kế thừa attributes cũ (color)
            ...this.parent?.(),

            // Thêm attribute 'id'
            id: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-id'),
                renderHTML: (attributes) => {
                    if (!attributes.id) {
                        return {};
                    }
                    return {
                        'data-id': attributes.id,
                    };
                },
            },
        };
    },

    // 2. Định nghĩa Command mới
    addCommands() {
        return {
            setCustomHighlight:
                (attributes) =>
                    ({ commands }) => {
                        return commands.setMark(this.name, attributes);
                    },
            toggleCustomHighlight:
                (attributes) =>
                    ({ commands }) => {
                        return commands.toggleMark(this.name, attributes);
                    },
            unsetCustomHighlight:
                () =>
                    ({ commands }) => {
                        return commands.unsetMark(this.name);
                    },
        };
    },
});