import * as React from 'react';
import { Body, Head, Heading, Html, Link, Preview, Section, Tailwind, Text } from '@react-email/components';

interface BaseEmailTemplateProps {
  preview: string;
  heading: string;
  eyebrow?: string;
  intro: string;
  children?: React.ReactNode;
  supportEmail?: string;
}

export function BaseEmailTemplate({
  preview,
  heading,
  eyebrow = 'CHAMPINO ZOO',
  intro,
  children,
  supportEmail = 'aristiktop8@gmail.com',
}: BaseEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-[#fff6f6] px-4 py-10">
          <Section className="mx-auto w-full max-w-2xl rounded-3xl border border-[#ffd9dc] bg-white px-8 py-9 shadow-sm">
            <Section className="mb-6 text-center">
              <Text className="m-0 inline-block rounded-full bg-[#ffecee] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[#bb2634] uppercase">
                {eyebrow}
              </Text>
            </Section>

            <Heading className="m-0 text-center text-[28px] leading-tight font-bold text-[#19161b]">
              {heading}
            </Heading>

            <Text className="mx-auto mt-4 mb-0 max-w-xl text-center text-[15px] leading-7 text-[#584b52]">
              {intro}
            </Text>

            {children}
          </Section>

          <Section className="mx-auto mt-4 w-full max-w-2xl rounded-2xl border border-[#ffe8ea] bg-[#fffafb] px-6 py-4 text-center">
            <Text className="m-0 text-[13px] leading-6 text-[#6f6067]">
              Программа лояльности CHAMPINO ZOO: 5 покупок = скидка 2%, 15 = 5%,
              30 = 8%, 50 = 10%.
            </Text>
          </Section>

          <Section className="mx-auto mt-3 w-full max-w-2xl rounded-2xl border border-[#ffe8ea] bg-[#fffafb] px-6 py-4 text-center">
            <Text className="m-0 text-[13px] leading-6 text-[#6f6067]">
              Вопросы? Напишите нам:{' '}
              <Link href={`mailto:${supportEmail}`} className="font-medium text-[#c62131] underline">
                {supportEmail}
              </Link>
            </Text>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
}