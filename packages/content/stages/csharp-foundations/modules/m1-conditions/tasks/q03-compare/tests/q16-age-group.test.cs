public class Q16AgeGroupTests
{
    [Theory(DisplayName = "Q16 以上（年齢）")]
    [InlineData(20, "adult")]
    [InlineData(19, "child")]
    [InlineData(0, "child")]
    public void Q16AgeGroup(int age, string expected)
    {
        Assert.Equal(expected, Answers.Q16AgeGroup(age));
    }
}
