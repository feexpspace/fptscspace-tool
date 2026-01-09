'use server'
import { db } from "@/lib/firebase";
import { Feedback, Script } from "@/types/index";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";

// Member gửi kịch bản
export async function createScript(data: Omit<Script, 'id' | 'createdAt' | 'status'>) {
    await addDoc(collection(db, "scripts"), {
        ...data,
        status: 'draft',
        createdAt: new Date(),
    });
}

// Manager duyệt/từ chối
export async function updateScriptStatus(scriptId: string, status: 'approved' | 'rejected') {
    await updateDoc(doc(db, "scripts", scriptId), { status });
}

// Manager gửi Feedback
export async function sendFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>) {
    await addDoc(collection(db, "feedbacks"), {
        ...feedback,
        createdAt: new Date(),
        isReaded: false
    });
}