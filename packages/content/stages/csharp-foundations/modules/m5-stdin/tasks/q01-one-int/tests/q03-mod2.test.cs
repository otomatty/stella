public class Q03Mod2Tests
{
    [Theory(DisplayName = "Q03 2で割った余り")]
    [InlineData("7\n", "1\n")]
    [InlineData("8\n", "0\n")]
    [InlineData("0\n", "0\n")]
    public void Q03Mod2(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q03Mod2())));
    }
}
