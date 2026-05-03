import * as React from 'react';
import { Link, Section, Text } from '@react-email/components';
import { BaseEmailTemplate } from './base-email.template';


interface AccountDeletionTemplateProps {
    domain: string;
}

export function AccountDeletionTemplate({ domain }: AccountDeletionTemplateProps) {
    const registerLink = `${domain}/account/create`;

    return (
        <BaseEmailTemplate
            preview="Champino: аккаунт удален"
            eyebrow="CHAMPINO ACCOUNT"
            heading="Аккаунт удален"
            intro="Ваш аккаунт и связанные данные полностью удалены. Вы больше не будете получать уведомления на email и push-каналы."
        >
            <Section className="mt-7 text-center">
                <Link
                    href={registerLink}
                    className="inline-block rounded-xl bg-[#ef2433] px-6 py-3 text-sm font-semibold text-white no-underline"
                >
                    Создать новый аккаунт
                </Link>
            </Section>
            <Text className="mx-auto mt-4 mb-0 max-w-xl text-center text-[13px] leading-6 text-[#6f6067]">
                Спасибо, что были с нами. Будем рады видеть вас снова в CHAMPINO ZOO.
            </Text>
        </BaseEmailTemplate>
    );
}
