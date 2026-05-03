import * as React from 'react';
import { Link, Section, Text } from '@react-email/components';
import { BaseEmailTemplate } from './base-email.template';

interface VerificationTemplateProps {
    domain: string;
    token: string;
}

export function verificationTemplate({ domain, token }: VerificationTemplateProps) {
    const verificationLink = `${domain}/account/verify?token=${token}`;

    return (
        <BaseEmailTemplate
            preview="Champino: подтверждение почты"
            eyebrow="CHAMPINO ACCOUNT"
            heading="Подтвердите вашу почту"
            intro="Спасибо за регистрацию в CHAMPINO ZOO. Чтобы активировать аккаунт, подтвердите адрес электронной почты по кнопке ниже."
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
                Если вы не создавали аккаунт, просто проигнорируйте это письмо.
            </Text>
        </BaseEmailTemplate>
    );
}
