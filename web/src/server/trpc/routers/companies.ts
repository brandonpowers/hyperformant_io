import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const companiesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.company.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.prisma.company.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          reports: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      if (!company) {
        throw new Error('Company not found')
      }

      return company
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        domain: z.string().optional(),
        industry: z.string().optional(),
        employees: z.number().optional(),
        revenue: z.string().optional(),
        founded: z.date().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.company.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        employees: z.number().optional(),
        revenue: z.string().optional(),
        founded: z.date().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      return ctx.prisma.company.update({
        where: {
          id,
          userId: ctx.session.user.id,
        },
        data: updateData,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.company.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })
    }),
})