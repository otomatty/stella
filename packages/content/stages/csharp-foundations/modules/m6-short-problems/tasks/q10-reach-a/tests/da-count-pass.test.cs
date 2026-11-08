public class DaCountPassTests
{
    [Theory(DisplayName = "到達A 70以上")]
    [InlineData("3\n69\n70\n100\n", "2\n")]
    [InlineData("0\n", "0\n")]
    [InlineData("1\n70\n", "1\n")]
    public void DaCountPass(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.DaCountPass())));
    }
}
