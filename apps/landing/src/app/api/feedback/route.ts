import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { feedback, email } = await req.json();

    if (!feedback || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback message cannot be empty' },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL is not set in environment variables.');
      return NextResponse.json(
        { error: 'Discord webhook integration is not configured on the server.' },
        { status: 500 }
      );
    }

    const payload = {
      embeds: [
        {
          title: '💡 New Feature Request / Feedback',
          description: feedback,
          color: 13754435, // #D1E043 equivalent
          fields: email
            ? [
                {
                  name: 'Contact',
                  value: email,
                  inline: true,
                },
              ]
            : [],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'BACHAM Feedback System',
          },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord API responded with status ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
