#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

pub mod instructions;

pub use instructions::*;
use solana_program::{native_token::LAMPORTS_PER_SOL, pubkey};

declare_id!("PATHrLe2WkDq1WS9df5dSuZ5MhnZZzGZmXcj4wGFCys");

pub(crate) const TREASURY: Pubkey = pubkey!("patht4uEaSDieLqjU4EZ8PZRWs2dPCQMqorCTZhVPMB");
pub(crate) const VALIDATION_FEE: u64 = (0.01f64 * (LAMPORTS_PER_SOL as f64)) as u64;

#[program]
pub mod bgl_path_validator {
    use super::*;

    pub fn validate_u8(ctx: Context<ValidateU8>, args: ValidateU8Args) -> Result<()> {
        ValidateU8::handler(ctx, args)
    }
}

#[error_code]
pub enum PathValidatorError {
    #[msg("Incorrect path")]
    IncorrectPath,

    #[msg("Max speed exceeded")]
    MaxSpeedExceeded,

    #[msg("Incorrect path and max speed exceeded")]
    IncorrectPathAndMaxSpeedExceeded,
}
