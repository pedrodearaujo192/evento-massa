
'use server';
/**
 * @fileOverview Fluxo para criação de pagamentos via Mercado Pago (PIX).
 *
 * - createPayment - Cria um pagamento (PIX) no Mercado Pago usando credenciais seguras.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import MercadoPagoConfig, { Payment } from 'mercadopago';

// O token deve ser configurado via variável de ambiente para segurança.
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  options: { timeout: 5000 }
});

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
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('Atenção Desenvolvedor: MERCADO_PAGO_ACCESS_TOKEN não foi configurado nas variáveis de ambiente.');
    }

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
      // Nas credenciais de teste, o MP pode exigir campos adicionais dependendo da configuração da conta
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
      // Se for erro de validação (comum em sandbox), tentamos dar um retorno mais amigável
      const errorMessage = error.cause?.[0]?.description || error.message || 'Erro ao processar PIX.';
      throw new Error(`Mercado Pago: ${errorMessage}`);
    }
  }
);
