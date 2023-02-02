# 🏗 OP Games Scaffold (based on scaffold-eth-typescript)

Ensure python3 is installed

### Running Brownie

1. Set up a virtual environment on .venv

   ```bash
   python3 -m venv .venv
   ```

2. Activate virtual environment

   ```bash
   source .venv/bin/activate
   ```

3. Install dependencies 

   ```bash
   pip install -e "cli[dev]"
   ```

4. Install Solidity dependencies

   ```bash
   pip install -e "cli[dev]"
   ```

5. Install openzeppelin

   ```bash
   brownie pm install OpenZeppelin/openzeppelin-contracts@4.3.2
   ```

TODO: Currently fails due to conflict with <b>import openzeppelin-contracts</b> and <b>import openzeppelin</b>