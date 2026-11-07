public class S09ColorsTests
{
    [Theory(DisplayName = "S09 異なる色")]
    [InlineData("3\nred\nred\nblue\n", "2\n")]
    [InlineData("2\nred\nred\n", "0\n")]
    public void S09Colors(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S09Colors())));
    }
}
