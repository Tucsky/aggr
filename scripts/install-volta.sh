#!/bin/sh

# Function to check if a package is installed
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Volta is installed
if command_exists volta; then
    echo "Volta is already installed."
else
    read -p "Volta is not installed. Would you like to install it now? (y/n): " choice
    case $choice in
        [Yy]*)
            # Install Volta
            curl https://get.volta.sh | bash

			BASHRC_FILE="$HOME/.bashrc"
			VOLTA_HOME="$HOME/.volta"
			VOLTA_PATH="$VOLTA_HOME/bin"

			# Check if ~/.bashrc exists
			if [ ! -f "$BASHRC_FILE" ]; then
			# Create ~/.bashrc if it doesn't exist
			touch "$BASHRC_FILE"
			fi

			# Check if the Volta variables already exist in ~/.bashrc
			if ! grep -q "VOLTA_HOME=" "$BASHRC_FILE" || ! grep -q "PATH=.*$VOLTA_PATH" "$BASHRC_FILE"; then
			# Append the Volta variables if they don't exist
			echo "export VOLTA_HOME=\"$VOLTA_HOME\"" >> "$BASHRC_FILE"
			echo "export PATH=\"$VOLTA_PATH:\$PATH\"" >> "$BASHRC_FILE"
			echo "Volta variables added to $BASHRC_FILE"
			else
			echo "Volta variables already exist in $BASHRC_FILE"
			fi

			source $BASHRC_FILE
			
			# Add export line to bashrc
			echo "Volta installed successfully."
		;;
        *)
			echo "Skipping Volta installation."
		;;
    esac
fi

