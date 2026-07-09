import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feedback, messages, deviceId } = body;

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
    }

    const feedbackCollection = db.collection('feedback');
    await feedbackCollection.add({
      feedback,
      messages: messages || [],
      deviceId: deviceId || 'unknown',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
