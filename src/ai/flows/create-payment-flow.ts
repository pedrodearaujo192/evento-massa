
'use server';
/**
 * @fileOverview Fluxo para criação de pagamentos via Mercado Pago (PIX).
 *
 * - createPayment - Cria um pagamento (PIX) no Mercado Pago usando credenciais seguras.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import MercadoPagoConfig, { Payment } from 'mercadopago';

const CreatePaymentInputSchema = z.object({
  amount: z.number().describe('Valor total do pagamento em Reais (ex: 150.00).'),
  email: z.string().email().describe('E-mail do pagador.'),
  description: z.string().describe('Descrição do que está sendo pago.'),
  fullName: z.string().describe('Nome completo do pagador.'),
  identificationNumber: z.string().describe('CPF do pagador (apenas números).'),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;

export async function createPayment(input: CreatePaymentInput) {
  return createPaymentFlow(input);
}

const createPaymentFlow = ai.defineFlow(
  {
    name: 'createPaymentFlow',
    inputSchema: CreatePaymentInputSchema,
  },
  async (input) => {
    const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();

    if (!accessToken || accessToken === 'SEU_TOKEN_AQUI' || accessToken === '') {
      throw new Error('CONFIGURAÇÃO NECESSÁRIA: Você precisa colar o seu Access Token no arquivo .env.');
    }

    try {
      const client = new MercadoPagoConfig({
        accessToken: accessToken,
        options: { timeout: 15000 }
      });

      const payment = new Payment(client);
      
      const nameParts = input.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Participante';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Visitante';
      const cleanCPF = input.identificationNumber.replace(/\D/g, '');

      const body = {
        transaction_amount: Number(input.amount.toFixed(2)),
        description: input.description.substring(0, 60),
        payment_method_id: 'pix',
        payer: {
          email: input.email.trim(),
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: cleanCPF,
          },
        },
      };

      // Log de depuração silencioso no servidor para o desenvolvedor
      console.log(`Gerando PIX: R$ ${body.transaction_amount} para ${body.payer.email}`);

      const response = await payment.create({ body });
      
      return {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        qr_code: response.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
      };
    } catch (error: any) {
      console.error('ERRO DETALHADO MERCADO PAGO:', JSON.stringify(error.cause || error, null, 2));
      
      const apiError = error.cause?.[0];
      const description = apiError?.description || '';
      const rawMessage = error.message || '';

      // Erro de Identidade Financeira (Comum em Sandbox com CPF real ou inválido)
      if (description.includes('Financial Identity') || description.includes('identification')) {
        throw new Error('DADOS INVÁLIDOS: O Mercado Pago rejeitou o CPF ou o Nome. Se estiver em ambiente de TESTE, você precisa usar um CPF de teste válido (gerado por um gerador de CPF) e um e-mail diferente do e-mail da sua conta de vendedor.');
      }

      if (rawMessage.includes('Unauthorized use of live credentials')) {
        throw new Error('CREDENCIAIS: Use o Token de TESTE ou ative sua conta de PRODUÇÃO no painel do Mercado Pago.');
      }

      const errorMessage = description || error.message || 'Erro ao processar PIX.';
      throw new Error(`Mercado Pago: ${errorMessage}`);
    }
  }
);
