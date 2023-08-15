use anchor_lang::{
    prelude::*,
    solana_program::{hash::HASH_BYTES, keccak},
};
use solana_program::{program::invoke, system_instruction};

use crate::{PathValidatorError, TREASURY, VALIDATION_FEE};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct ValidateU8Args {
    pub proof: [u8; 32],
    pub path: Vec<u8>,
}

#[derive(Accounts)]
pub struct ValidateU8<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = TREASURY)]
    /// CHECK: Checked in constraint
    pub treasury: AccountInfo<'info>,

    system_program: Program<'info, System>,
}

impl ValidateU8<'_> {
    pub fn handler(ctx: Context<ValidateU8>, args: ValidateU8Args) -> Result<()> {
        let computed_hash = Self::get_hash(args.path.clone());
        let max_speed = Self::get_speed(args.path);
        solana_program::msg!("Computed hash: {:?}", computed_hash);
        solana_program::msg!("Max speed: {:?}", max_speed);

        let ix = system_instruction::transfer(ctx.accounts.payer.key, &TREASURY, VALIDATION_FEE);
        invoke(
            &ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        if computed_hash != Some(args.proof) && max_speed > 1 {
            return Err(PathValidatorError::IncorrectPathAndMaxSpeedExceeded.into());
        } else if computed_hash != Some(args.proof) {
            return Err(PathValidatorError::IncorrectPath.into());
        } else if max_speed > 1 {
            return Err(PathValidatorError::MaxSpeedExceeded.into());
        }

        Ok(())
    }

    fn get_hash(path: Vec<u8>) -> Option<[u8; HASH_BYTES]> {
        let mut computed_hash: Option<[u8; HASH_BYTES]> = None;
        for chunk in path.chunks(32) {
            match computed_hash {
                None => {
                    computed_hash = Some(keccak::hashv(&[&[0x01], chunk]).0);
                }
                Some(hash) => {
                    computed_hash = Some(keccak::hashv(&[&[0x01], &hash, chunk]).0);
                }
            }
        }

        computed_hash
    }

    fn get_speed(path: Vec<u8>) -> u8 {
        let mut max_speed = 0;

        for i in (0..(path.len() - 3)).step_by(2) {
            let pos0 = (path[i] as i16, path[i + 1] as i16);
            let pos1 = (path[i + 2] as i16, path[i + 3] as i16);

            let speed = (((pos0.0 - pos1.0).pow(2) + (pos0.1 - pos1.1).pow(2)) as f32).sqrt() as u8;
            max_speed = max_speed.max(speed);
        }

        max_speed
    }
}
