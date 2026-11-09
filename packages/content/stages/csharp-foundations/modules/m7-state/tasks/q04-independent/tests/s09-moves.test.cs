public class S09MovesTests
{
    [Theory(DisplayName = "S09 移動の範囲")]
    [InlineData("4\nL\nR\nR\nL\n", "-1\n1\n")]
    [InlineData("0\n", "0\n0\n")]
    public void S09Moves(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S09Moves())));
    }
}
