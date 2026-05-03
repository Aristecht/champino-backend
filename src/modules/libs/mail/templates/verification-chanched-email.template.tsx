import * as React from 'react';
import { Link, Section, Text } from '@react-email/components';
import { BaseEmailTemplate } from './base-email.template';

interface VerificationTemplateProps {
  domain: string;
  token: string;
}

export function verificationNewEmailTemplate({ domain, token }: VerificationTemplateProps) {
  const verificationLink = `${domain}/account/verify-new-email?token=${token}`;

  return (
    <BaseEmailTemplate
      preview="Champino: подтверждение новой почты"
      eyebrow="CHAMPINO SECURITY"
      heading="Подтверждение новой почты"
      intro="Вы запросили смену email в аккаунте CHAMPINO ZOO. Чтобы завершить изменение, подтвердите новый адрес кнопкой ниже."
    >
      <Section className="mt-7 text-center">
        <Link
          href={verificationLink}
          className="inline-block rounded-xl bg-[#ef2433] px-6 py-3 text-sm font-semibold text-white no-underline"
        >
          Подтвердить почту
        </Link>
      </Section>
      <Text className="mx-auto mt-4 mb-0 max-w-xl text-center text-[13px] leading-6 text-[#6f6067]">
        Если это были не вы, просто проигнорируйте письмо. Доступ к аккаунту
        останется без изменений.
      </Text>
    </BaseEmailTemplate>
  );
}