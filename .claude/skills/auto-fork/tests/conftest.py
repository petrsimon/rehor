"""Shared test fixtures and utilities."""

import json
import subprocess

import pytest

# Test constants
TEST_BOT_USERNAME = "test-bot"
GITLAB_HOST = "gitlab.cee.redhat.com"  # Match constant from auto_fork.py

# Test data - repos configuration for fixtures
TEST_REPOS_CONFIG = {
    "test-repo-1": {
        "url": f"https://github.com/{TEST_BOT_USERNAME}/test-repo-1.git",
        "upstream": "https://github.com/TestOrg/test-repo-1.git",
    },
    "test-repo-2": {
        "url": "https://github.com/other-user/test-repo-2.git",
        "upstream": "https://github.com/TestOrg/test-repo-2.git",
    },
    "gitlab-repo": {
        "url": f"https://{GITLAB_HOST}/other-user/gitlab-repo.git",
        "upstream": f"https://{GITLAB_HOST}/TestOrg/gitlab-repo.git",
        "host": "gitlab",
    },
}


@pytest.fixture(autouse=True)
def set_env_vars(monkeypatch):
    """Set required env vars for all tests."""
    monkeypatch.setenv("GH_USER_NAME", TEST_BOT_USERNAME)
    monkeypatch.setenv("GL_USER_NAME", TEST_BOT_USERNAME)


@pytest.fixture
def temp_config_dir(tmp_path, monkeypatch):
    """
    Create temporary config directory structure with git repo.

    Creates:
    - data/remote-config/test-config/agent/project-repos.json
    - Initialized git repo with origin remote
    - Monkeypatches REMOTE_CONFIG_DIR to point to temp location
    """
    # Create data/remote-config structure (matches bot runtime)
    data_dir = tmp_path / "data"
    remote_config_dir = data_dir / "remote-config"
    config_dir = remote_config_dir / "test-config"
    agent_dir = config_dir / "agent"
    agent_dir.mkdir(parents=True)

    # Create project-repos.json using shared test data
    project_repos_path = agent_dir / "project-repos.json"
    project_repos_path.write_text(json.dumps(TEST_REPOS_CONFIG, indent=2))

    # Initialize git repo
    subprocess.run(["git", "init"], cwd=config_dir, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=config_dir, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=config_dir, capture_output=True, check=True)
    subprocess.run(["git", "add", "."], cwd=config_dir, capture_output=True, check=True)
    subprocess.run(["git", "commit", "-m", "Initial"], cwd=config_dir, capture_output=True, check=True)
    subprocess.run(
        ["git", "remote", "add", "origin", "https://github.com/test-org/test-config.git"],
        cwd=config_dir,
        capture_output=True,
        check=True,
    )

    # Monkeypatch REMOTE_CONFIG_DIR to point to temp location
    import auto_fork

    monkeypatch.setattr(auto_fork, "REMOTE_CONFIG_DIR", remote_config_dir)

    return config_dir


@pytest.fixture
def mock_subprocess_result():
    """
    Factory fixture for creating mock subprocess results.

    Returns a function that creates Mock objects with subprocess.CompletedProcess attributes.
    """
    from unittest.mock import Mock

    def _make_result(returncode: int = 0, stdout: str = "", stderr: str = ""):
        """
        Create a mock subprocess result.

        Args:
            returncode: Process return code (0 = success)
            stdout: Standard output
            stderr: Standard error

        Returns:
            Mock object with subprocess.CompletedProcess attributes
        """
        result = Mock()
        result.returncode = returncode
        result.stdout = stdout
        result.stderr = stderr
        return result

    return _make_result
