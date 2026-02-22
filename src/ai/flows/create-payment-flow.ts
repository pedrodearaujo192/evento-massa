
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
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken || accessToken === 'SEU_TOKEN_AQUI') {
      throw new Error('CONFIGURAÇÃO NECESSÁRIA: Você precisa colar o seu Access Token do Mercado Pago no arquivo .env (MERCADO_PAGO_ACCESS_TOKEN).');
    }

    const client = new MercadoPagoConfig({
      accessToken: accessToken,
      options: { timeout: 10000 } // Aumentado para evitar timeouts em conexões lentas
    });

    const payment = new Payment(client);
    
    // Divide o nome para os campos obrigatórios do MP
    const nameParts = input.fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Participante';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Beleza';

    const body = {
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: 'pix',
      payer: {
        email: input.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: input.identificationNumber.replace(/\D/g, ''),
        },
      },
      installments: 1,
    };

    try {
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
      console.error('Erro detalhado Mercado Pago:', error.message || error);
      // Erro amigável para o usuário final
      const errorMessage = error.cause?.[0]?.description || error.message || 'Erro ao processar PIX.';
      throw new Error(`Mercado Pago: ${errorMessage}`);
    }
  }
);
