public class R1FeeTests
{
    [Theory(DisplayName = "R1")]
    [InlineData(12, 200)]
    [InlineData(11, 100)]
    [InlineData(0, 100)]
    [InlineData(120, 200)]
    public void R1Fee(int age, int expected)
    {
        Assert.Equal(expected, Answers.R1Fee(age));
    }
}
