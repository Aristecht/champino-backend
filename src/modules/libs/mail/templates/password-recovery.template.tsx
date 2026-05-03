import * as React from 'react';
import { Heading, Link, Section, Text } from '@react-email/components';
import type { SessionMetadata } from '../../../../shared/types/session-metadata.types';
import { BaseEmailTemplate } from './base-email.template';

interface PasswordResetTemplateProps {
    domain: string;
    token: string;
    metadata: SessionMetadata;
}

export function PasswordResetTemplate({ domain, token, metadata }: PasswordResetTemplateProps) {
    const resetLink = `${domain}/account/recovery/${token}`;

    return (
        <BaseEmailTemplate
            preview="Champino: сброс пароля"
            eyebrow="CHAMPINO SECURITY"
            heading="Сброс пароля"
            intro="Вы запросили создание нового пароля для вашей учетной записи. Перейдите по ссылке ниже, чтобы завершить восстановление."
        >
            <Section className="mt-7 text-center">
                <Link
                    href={resetLink}
                    className="inline-block rounded-xl bg-[#ef2433] px-6 py-3 text-sm font-semibold text-white no-underline"
                >
                    Сбросить пароль
                </Link>
            </Section>

            <Section className="mx-auto mt-5 w-full max-w-xl rounded-2xl border border-[#ffe4e7] bg-[#fff8f9] px-5 py-5">
                <Heading className="m-0 mb-3 text-lg font-semibold text-[#bf2432]">
                    Информация о запросе
                </Heading>
                <Text className="m-0 text-[14px] leading-7 text-[#54474e]">
                    📍 Расположение: {metadata.location.country}, {metadata.location.city}
                    <br />📱 Устройство: {metadata.device.type}, {metadata.device.os}
                    <br />🌍 Браузер: {metadata.device.browser}
                    <br />💻 IP-адрес: {metadata.ip}
                </Text>
                <Text className="m-0 mt-3 text-[13px] leading-6 text-[#6f6067]">
                    Если вы не запрашивали сброс, просто проигнорируйте это письмо.
                </Text>
            </Section>
        </BaseEmailTemplate>
    );
}
