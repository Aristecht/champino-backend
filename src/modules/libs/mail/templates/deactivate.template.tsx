import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import type { SessionMetadata } from '../../../../shared/types/session-metadata.types';
import { BaseEmailTemplate } from './base-email.template';

interface DeactiavteTemplateProps {
    token: string;
    metadata: SessionMetadata;
}

export function DeactiavteTemplate({ token, metadata }: DeactiavteTemplateProps) {
    return (
        <BaseEmailTemplate
            preview="Champino: деактивация аккаунта"
            eyebrow="CHAMPINO SECURITY"
            heading="Деактивация аккаунта"
            intro="Вы инициировали деактивацию аккаунта. Используйте код подтверждения ниже в течение 5 минут."
        >
            <Section className="mx-auto mt-5 w-full max-w-xl rounded-2xl border border-[#ffe4e7] bg-[#fff8f9] px-6 py-6 text-center">
                <Text className="m-0 text-xs font-semibold tracking-[0.12em] text-[#b02432] uppercase">
                    Код подтверждения
                </Text>
                <Heading className="m-0 mt-2 text-[34px] font-bold tracking-[0.2em] text-[#c62131]">
                    {token}
                </Heading>
                <Text className="m-0 mt-2 text-[13px] leading-6 text-[#6f6067]">
                    Код действителен 5 минут.
                </Text>
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
                    Если вы не запускали этот процесс, проигнорируйте письмо.
                </Text>
            </Section>
        </BaseEmailTemplate>
    );
}
